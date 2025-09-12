package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	
	"firebase.google.com/go"
	"firebase.google.com/go/auth"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"google.golang.org/api/option"
	
	"github.com/LukeAtkinz/dashdice/go-services/shared/config"
	"github.com/LukeAtkinz/dashdice/go-services/shared/database"
	"github.com/LukeAtkinz/dashdice/go-services/shared/middleware"
)

func main() {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		panic("Failed to load configuration: " + err.Error())
	}
	
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		panic("Failed to initialize logger: " + err.Error())
	}
	defer logger.Sync()
	
	// Initialize database manager
	dbManager := database.NewDatabaseManager(cfg, logger)
	
	// Connect to databases
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	if err := dbManager.Initialize(ctx); err != nil {
		logger.Fatal("Failed to connect to databases", zap.Error(err))
	}
	defer dbManager.Close()
	
	// Initialize API Gateway server
	server := NewAPIGatewayServer(cfg, logger, dbManager)
	
	// Start server
	logger.Info("Starting API Gateway server", 
		zap.String("address", cfg.APIGatewayAddr),
		zap.String("environment", cfg.Environment))
	
	go func() {
		if err := server.Start(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()
	
	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	
	logger.Info("Shutting down API Gateway server...")
	
	// Graceful shutdown with timeout
	ctx, cancel = context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("Server forced to shutdown", zap.Error(err))
	}
	
	logger.Info("API Gateway server stopped")
}

// APIGatewayServer represents the API Gateway server
type APIGatewayServer struct {
	config      *config.Config
	logger      *zap.Logger
	dbManager   database.DatabaseManager
	server      *http.Server
	engine      *gin.Engine
	firebaseApp *firebase.App
	authClient  *auth.Client
	authMiddleware *middleware.FirebaseAuthMiddleware
}

// NewAPIGatewayServer creates a new API Gateway server instance
func NewAPIGatewayServer(cfg *config.Config, logger *zap.Logger, dbManager database.DatabaseManager) *APIGatewayServer {
	// Set Gin mode based on environment
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	
	server := &APIGatewayServer{
		config:    cfg,
		logger:    logger,
		dbManager: dbManager,
		engine:    gin.New(),
	}
	
	// Initialize Firebase
	if err := server.initializeFirebase(); err != nil {
		logger.Fatal("Failed to initialize Firebase", zap.Error(err))
	}
	
	server.setupMiddleware()
	server.setupRoutes()
	
	return server
}

// initializeFirebase sets up Firebase app and auth client
func (s *APIGatewayServer) initializeFirebase() error {
	ctx := context.Background()
	
	// Initialize Firebase app with service account
	credentialsPath := s.config.FirebaseCredentialsPath
	if credentialsPath == "" {
		credentialsPath = "./serviceAccountKey.json"
	}
	
	opt := option.WithCredentialsFile(credentialsPath)
	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		return fmt.Errorf("error initializing firebase app: %v", err)
	}
	
	// Get Auth client
	authClient, err := app.Auth(ctx)
	if err != nil {
		return fmt.Errorf("error getting firebase auth client: %v", err)
	}
	
	// Store Firebase instances
	s.firebaseApp = app
	s.authClient = authClient
	
	// Create auth middleware
	s.authMiddleware = middleware.NewFirebaseAuthMiddleware(authClient, s.logger)
	
	s.logger.Info("Firebase initialized successfully")
	return nil
}

// setupMiddleware configures all middleware for the API Gateway
func (s *APIGatewayServer) setupMiddleware() {
	// Recovery middleware with custom logger
	s.engine.Use(middleware.RecoveryMiddleware(s.logger))
	
	// Request ID middleware
	s.engine.Use(middleware.RequestIDMiddleware(s.logger))
	
	// Logging middleware
	if s.config.Environment == "development" {
		s.engine.Use(middleware.DetailedLoggingMiddleware(s.logger))
	} else {
		s.engine.Use(middleware.LoggingMiddleware(s.logger))
	}
	
	// Security headers
	s.engine.Use(middleware.SecurityHeadersMiddleware())
	
	// CORS middleware
	allowedOrigins := []string{
		"http://localhost:3000",     // Next.js dev server (default)
		"http://localhost:3001",     // Next.js dev server (alternate port)
		"https://dashdice.com",      // Production frontend
		"https://www.dashdice.gg",   // Production frontend (www)
		"https://dashdice.gg",       // Production frontend (no www)
		"https://dashdice.vercel.app", // Vercel deployment
	}
	if s.config.Environment == "development" {
		allowedOrigins = append(allowedOrigins, "*")
	}
	s.engine.Use(middleware.CORSMiddleware(allowedOrigins))
	
	// Rate limiting - different limits for different environments
	if s.config.Environment == "production" {
		s.engine.Use(middleware.UserRateLimiter(60, 120, s.logger)) // 60 req/sec, burst 120
	} else {
		s.engine.Use(middleware.LenientRateLimiter(s.logger)) // More permissive for development
	}
}

// setupRoutes configures all routes for the API Gateway
func (s *APIGatewayServer) setupRoutes() {
	// Health check endpoint (no auth required)
	s.engine.GET("/health", s.handleHealthCheck)
	s.engine.GET("/health/detailed", s.handleDetailedHealthCheck)
	
	// API version 1 routes
	v1 := s.engine.Group("/api/v1")
	{
		// Public endpoints (no auth required)
		public := v1.Group("/public")
		{
			public.GET("/status", s.handlePublicStatus)
			public.POST("/auth/verify", s.handleAuthVerify)
		}
		
		// Protected endpoints (require authentication)
		protected := v1.Group("/")
		protected.Use(s.authMiddleware.RequireAuth())
		{
			// User endpoints
			users := protected.Group("/users")
			{
				users.GET("/me", s.handleGetCurrentUser)
				users.PUT("/me", s.handleUpdateCurrentUser)
				users.GET("/me/stats", s.handleGetUserStats)
			}
			
			// Match endpoints
			matches := protected.Group("/matches")
			{
				matches.GET("/", s.handleListMatches)
				matches.POST("/", s.handleCreateMatch)
				matches.GET("/:id", s.handleGetMatch)
				matches.PUT("/:id", s.handleUpdateMatch)
				matches.DELETE("/:id", s.handleDeleteMatch)
			}
			
			// Queue endpoints
			queue := protected.Group("/queue")
			{
				queue.POST("/join", s.handleJoinQueue)
				queue.DELETE("/leave", s.handleLeaveQueue)
				queue.GET("/status", s.handleGetQueueStatus)
			}
			
			// Real-time endpoints
			realtime := protected.Group("/realtime")
			{
				realtime.GET("/ws", s.handleWebSocket)
				realtime.POST("/presence", s.handleUpdatePresence)
			}
		}
		
		// Admin endpoints (require admin role)
		admin := v1.Group("/admin")
		admin.Use(s.authMiddleware.RequireAuth(), s.authMiddleware.AdminOnly())
		{
			admin.GET("/users", s.handleAdminListUsers)
			admin.GET("/matches", s.handleAdminListMatches)
			admin.GET("/system/stats", s.handleAdminSystemStats)
			admin.POST("/system/maintenance", s.handleAdminMaintenance)
		}
	}
	
	// WebSocket upgrade endpoint
	s.engine.GET("/ws", s.handleWebSocket)
	
	// Catch-all for undefined routes
	s.engine.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Endpoint not found",
			"code":    "ENDPOINT_NOT_FOUND",
			"path":    c.Request.URL.Path,
			"method":  c.Request.Method,
		})
	})
}

// Start starts the API Gateway server
func (s *APIGatewayServer) Start() error {
	s.server = &http.Server{
		Addr:           s.config.APIGatewayAddr,
		Handler:        s.engine,
		ReadTimeout:    30 * time.Second,
		WriteTimeout:   30 * time.Second,
		IdleTimeout:    120 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1MB
	}
	
	return s.server.ListenAndServe()
}

// Shutdown gracefully shuts down the API Gateway server
func (s *APIGatewayServer) Shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}

// Handler functions

// handleHealthCheck provides basic health status
func (s *APIGatewayServer) handleHealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "api-gateway",
		"timestamp": time.Now().Unix(),
		"version":   "1.0.0",
	})
}

// handleDetailedHealthCheck provides detailed health status including database connections
func (s *APIGatewayServer) handleDetailedHealthCheck(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	
	// Check database health
	dbHealth, err := s.dbManager.HealthCheck(ctx)
	if err != nil {
		s.logger.Error("Database health check failed", zap.Error(err))
	}
	
	response := gin.H{
		"status":    "healthy",
		"service":   "api-gateway",
		"timestamp": time.Now().Unix(),
		"version":   "1.0.0",
		"database":  dbHealth,
	}
	
	// Determine overall status from database health checks
	overallHealthy := true
	if dbHealth != nil {
		for _, health := range dbHealth {
			if health != nil && health.Status != "healthy" {
				overallHealthy = false
				break
			}
		}
	} else {
		overallHealthy = false
	}
	
	if !overallHealthy {
		response["status"] = "degraded"
		c.JSON(http.StatusServiceUnavailable, response)
		return
	}
	
	c.JSON(http.StatusOK, response)
}

// handlePublicStatus provides public status information
func (s *APIGatewayServer) handlePublicStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"service":     "DashDice API Gateway",
		"version":     "1.0.0",
		"environment": s.config.Environment,
		"timestamp":   time.Now().Unix(),
		"endpoints": gin.H{
			"health":  "/health",
			"api":     "/api/v1",
			"websocket": "/ws",
		},
	})
}

// Auth handlers
func (s *APIGatewayServer) handleAuthVerify(c *gin.Context) {
	// Get the Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authorization header required",
			"code":  "MISSING_AUTH_HEADER",
		})
		return
	}

	// Extract Bearer token
	token := ""
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid authorization format. Use 'Bearer <token>'",
			"code":  "INVALID_AUTH_FORMAT",
		})
		return
	}

	// For now, we'll do basic validation - in production you'd verify Firebase JWT
	if len(token) < 10 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid token format",
			"code":  "INVALID_TOKEN",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid": true,
		"user_id": "temp_user_id", // This would come from Firebase JWT verification
		"message": "Token is valid",
	})
}

func (s *APIGatewayServer) handleGetCurrentUser(c *gin.Context) {
	// In a real implementation, we'd get user ID from JWT token
	userId := c.GetString("user_id") // This would be set by auth middleware
	if userId == "" {
		userId = "demo_user_123" // Demo fallback
	}

	c.JSON(http.StatusOK, gin.H{
		"id":       userId,
		"username": "DemoPlayer",
		"email":    "demo@dashdice.com",
		"stats": gin.H{
			"gamesPlayed": 42,
			"wins":       25,
			"losses":     17,
			"winRate":    0.595,
			"rank":       "Silver",
			"elo":        1250,
		},
		"inventory": gin.H{
			"dice":        []string{"standard", "golden", "rainbow"},
			"backgrounds": []string{"default", "space", "underwater"},
		},
		"preferences": gin.H{
			"theme":          "dark",
			"soundEnabled":   true,
			"musicEnabled":   true,
			"notifications":  true,
		},
	})
}

func (s *APIGatewayServer) handleUpdateCurrentUser(c *gin.Context) {
	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"code":  "INVALID_REQUEST_BODY",
		})
		return
	}

	// In a real implementation, you'd update the user in the database
	s.logger.Info("User update request received", 
		zap.Any("updateData", updateData))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User updated successfully",
		"updated_fields": updateData,
	})
}

func (s *APIGatewayServer) handleGetUserStats(c *gin.Context) {
	userId := c.GetString("user_id")
	if userId == "" {
		userId = "demo_user_123"
	}

	// Generate realistic stats for demo
	c.JSON(http.StatusOK, gin.H{
		"user_id": userId,
		"stats": gin.H{
			"total_games":    142,
			"wins":          85,
			"losses":        57,
			"win_rate":      0.599,
			"current_streak": 3,
			"best_streak":   12,
			"total_points":  15420,
			"rank":          "Gold III",
			"elo":           1485,
			"achievements": []gin.H{
				{"id": "first_win", "name": "First Victory", "unlocked": true},
				{"id": "win_10", "name": "Decathlon", "unlocked": true},
				{"id": "win_streak_5", "name": "Hot Streak", "unlocked": true},
				{"id": "play_100", "name": "Centurion", "unlocked": true},
			},
		},
		"recent_matches": []gin.H{
			{
				"id":          "match_001",
				"result":      "win",
				"opponent":    "Player_Alpha",
				"points":      150,
				"duration":    "00:12:34",
				"timestamp":   time.Now().Add(-2 * time.Hour).Unix(),
			},
			{
				"id":          "match_002", 
				"result":      "loss",
				"opponent":    "Player_Beta",
				"points":      -75,
				"duration":    "00:08:22",
				"timestamp":   time.Now().Add(-4 * time.Hour).Unix(),
			},
		},
	})
}

// Match handlers
func (s *APIGatewayServer) handleListMatches(c *gin.Context) {
	// Get query parameters
	status := c.DefaultQuery("status", "active")
	limit := c.DefaultQuery("limit", "10")
	
	// Generate demo matches
	matches := []gin.H{
		{
			"id":          "match_001",
			"status":      "waiting",
			"game_mode":   "classic",
			"players":     []string{"Player_Alpha"},
			"max_players": 2,
			"created_at":  time.Now().Add(-5 * time.Minute).Unix(),
		},
		{
			"id":          "match_002",
			"status":      "active",
			"game_mode":   "blitz",
			"players":     []string{"Player_Beta", "Player_Gamma"},
			"max_players": 2,
			"created_at":  time.Now().Add(-10 * time.Minute).Unix(),
			"started_at":  time.Now().Add(-8 * time.Minute).Unix(),
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"matches": matches,
		"filter": gin.H{
			"status": status,
			"limit":  limit,
		},
		"total": len(matches),
	})
}

func (s *APIGatewayServer) handleCreateMatch(c *gin.Context) {
	var matchRequest struct {
		GameMode    string `json:"game_mode" binding:"required"`
		MaxPlayers  int    `json:"max_players"`
		Private     bool   `json:"private"`
		Password    string `json:"password,omitempty"`
	}

	if err := c.ShouldBindJSON(&matchRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"code":  "INVALID_REQUEST_BODY",
			"details": err.Error(),
		})
		return
	}

	// Validate game mode
	validModes := []string{"classic", "blitz", "tournament", "custom"}
	validMode := false
	for _, mode := range validModes {
		if matchRequest.GameMode == mode {
			validMode = true
			break
		}
	}

	if !validMode {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid game mode",
			"code":  "INVALID_GAME_MODE",
			"valid_modes": validModes,
		})
		return
	}

	// Create match (in real implementation, save to database)
	matchId := fmt.Sprintf("match_%d", time.Now().Unix())
	
	match := gin.H{
		"id":          matchId,
		"game_mode":   matchRequest.GameMode,
		"max_players": matchRequest.MaxPlayers,
		"private":     matchRequest.Private,
		"status":      "waiting",
		"players":     []string{}, // Would include creator's user ID
		"created_at":  time.Now().Unix(),
		"created_by":  "demo_user_123", // Would come from JWT
	}

	s.logger.Info("Match created", 
		zap.String("match_id", matchId),
		zap.String("game_mode", matchRequest.GameMode))

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"match":   match,
	})
}

func (s *APIGatewayServer) handleGetMatch(c *gin.Context) {
	matchId := c.Param("id")
	if matchId == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Match ID is required",
			"code":  "MISSING_MATCH_ID",
		})
		return
	}

	// In real implementation, fetch from database
	match := gin.H{
		"id":          matchId,
		"status":      "active",
		"game_mode":   "classic",
		"max_players": 2,
		"players": []gin.H{
			{"id": "player_1", "username": "AlphaPlayer", "ready": true},
			{"id": "player_2", "username": "BetaPlayer", "ready": true},
		},
		"created_at": time.Now().Add(-15 * time.Minute).Unix(),
		"started_at": time.Now().Add(-10 * time.Minute).Unix(),
		"game_state": gin.H{
			"current_turn": "player_1",
			"turn_number": 5,
			"dice_results": []int{4, 2, 6},
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"match": match,
	})
}

func (s *APIGatewayServer) handleUpdateMatch(c *gin.Context) {
	matchId := c.Param("id")
	if matchId == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Match ID is required",
			"code":  "MISSING_MATCH_ID",
		})
		return
	}

	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"code":  "INVALID_REQUEST_BODY",
		})
		return
	}

	s.logger.Info("Match update request", 
		zap.String("match_id", matchId),
		zap.Any("update_data", updateData))

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"match_id":   matchId,
		"updated":    updateData,
		"timestamp":  time.Now().Unix(),
	})
}

func (s *APIGatewayServer) handleDeleteMatch(c *gin.Context) {
	matchId := c.Param("id")
	if matchId == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Match ID is required",
			"code":  "MISSING_MATCH_ID",
		})
		return
	}

	// In real implementation, delete from database and notify players
	s.logger.Info("Match deletion request", zap.String("match_id", matchId))

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "Match deleted successfully",
		"match_id":  matchId,
		"timestamp": time.Now().Unix(),
	})
}

// Queue handlers
func (s *APIGatewayServer) handleJoinQueue(c *gin.Context) {
	var queueRequest struct {
		GameMode   string `json:"game_mode" binding:"required"`
		Preference string `json:"preference"` // "ranked", "casual", "any"
	}

	if err := c.ShouldBindJSON(&queueRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"code":  "INVALID_REQUEST_BODY",
			"details": err.Error(),
		})
		return
	}

	userId := c.GetString("user_id")
	if userId == "" {
		userId = "demo_user_123"
	}

	// Simulate queue join
	queueEntry := gin.H{
		"user_id":           userId,
		"game_mode":        queueRequest.GameMode,
		"preference":       queueRequest.Preference,
		"queue_position":   3,
		"estimated_wait":   "2-3 minutes",
		"joined_at":        time.Now().Unix(),
	}

	s.logger.Info("User joined queue", 
		zap.String("user_id", userId),
		zap.String("game_mode", queueRequest.GameMode))

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"message":     "Successfully joined matchmaking queue",
		"queue_entry": queueEntry,
	})
}

func (s *APIGatewayServer) handleLeaveQueue(c *gin.Context) {
	userId := c.GetString("user_id")
	if userId == "" {
		userId = "demo_user_123"
	}

	s.logger.Info("User left queue", zap.String("user_id", userId))

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "Successfully left matchmaking queue",
		"user_id":   userId,
		"timestamp": time.Now().Unix(),
	})
}

func (s *APIGatewayServer) handleGetQueueStatus(c *gin.Context) {
	userId := c.GetString("user_id")
	if userId == "" {
		userId = "demo_user_123"
	}

	// Simulate queue status
	queueStatus := gin.H{
		"in_queue": true,
		"queue_info": gin.H{
			"position":       2,
			"estimated_wait": "1-2 minutes",
			"game_mode":      "classic",
			"joined_at":      time.Now().Add(-3 * time.Minute).Unix(),
		},
		"queue_stats": gin.H{
			"total_players":     156,
			"average_wait_time": "90 seconds",
			"active_matches":    23,
		},
	}

	c.JSON(http.StatusOK, queueStatus)
}

func (s *APIGatewayServer) handleWebSocket(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "WebSocket not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (s *APIGatewayServer) handleUpdatePresence(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (s *APIGatewayServer) handleAdminListUsers(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (s *APIGatewayServer) handleAdminListMatches(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (s *APIGatewayServer) handleAdminSystemStats(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (s *APIGatewayServer) handleAdminMaintenance(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}
