package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	
	"github.com/LukeAtkinz/dashdice/go-services/shared/config"
	"github.com/LukeAtkinz/dashdice/go-services/shared/database"
	"github.com/LukeAtkinz/dashdice/go-services/shared/middleware"
	"github.com/LukeAtkinz/dashdice/go-services/shared/models"
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
	
	// Initialize Match Service
	server := NewMatchService(cfg, logger, dbManager)
	
	// Start server
	logger.Info("Starting Match Service", 
		zap.String("address", cfg.MatchServiceAddr),
		zap.String("environment", cfg.Environment))
	
	go func() {
		if err := server.Start(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start Match Service", zap.Error(err))
		}
	}()
	
	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	
	logger.Info("Shutting down Match Service...")
	
	// Graceful shutdown with timeout
	ctx, cancel = context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("Match Service forced to shutdown", zap.Error(err))
	}
	
	logger.Info("Match Service stopped")
}

// MatchService handles all match-related operations
type MatchService struct {
	config    *config.Config
	logger    *zap.Logger
	dbManager database.DatabaseManager
	server    *http.Server
	engine    *gin.Engine
	
	// Match management
	gameEngine *GameEngine
}

// NewMatchService creates a new Match Service instance
func NewMatchService(cfg *config.Config, logger *zap.Logger, dbManager database.DatabaseManager) *MatchService {
	// Set Gin mode based on environment
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	
	service := &MatchService{
		config:     cfg,
		logger:     logger,
		dbManager:  dbManager,
		engine:     gin.New(),
		gameEngine: NewGameEngine(logger, dbManager),
	}
	
	service.setupMiddleware()
	service.setupRoutes()
	
	return service
}

// setupMiddleware configures middleware for the Match Service
func (ms *MatchService) setupMiddleware() {
	// Recovery middleware
	ms.engine.Use(middleware.RecoveryMiddleware(ms.logger))
	
	// Request ID middleware
	ms.engine.Use(middleware.RequestIDMiddleware(ms.logger))
	
	// Logging middleware
	ms.engine.Use(middleware.LoggingMiddleware(ms.logger))
	
	// Rate limiting for match operations
	ms.engine.Use(middleware.UserRateLimiter(30, 60, ms.logger))
}

// setupRoutes configures routes for the Match Service
func (ms *MatchService) setupRoutes() {
	// Health check
	ms.engine.GET("/health", ms.handleHealthCheck)
	
	// Internal API for other services
	internal := ms.engine.Group("/internal")
	{
		internal.POST("/matches", ms.handleCreateMatch)
		internal.GET("/matches/:id", ms.handleGetMatch)
		internal.PUT("/matches/:id", ms.handleUpdateMatch)
		internal.DELETE("/matches/:id", ms.handleDeleteMatch)
		internal.GET("/matches/:id/state", ms.handleGetMatchState)
		internal.PUT("/matches/:id/state", ms.handleUpdateMatchState)
		
		// Game actions
		internal.POST("/matches/:id/actions", ms.handleGameAction)
		internal.POST("/matches/:id/turn", ms.handleProcessTurn)
		internal.POST("/matches/:id/end", ms.handleEndMatch)
		
		// Match history
		internal.GET("/users/:userId/matches", ms.handleGetUserMatches)
		internal.GET("/matches/:id/history", ms.handleGetMatchHistory)
	}
	
	// WebSocket for real-time updates
	ms.engine.GET("/ws/:matchId", ms.handleMatchWebSocket)
}

// Start starts the Match Service
func (ms *MatchService) Start() error {
	ms.server = &http.Server{
		Addr:           ms.config.MatchServiceAddr,
		Handler:        ms.engine,
		ReadTimeout:    30 * time.Second,
		WriteTimeout:   30 * time.Second,
		IdleTimeout:    120 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1MB
	}
	
	return ms.server.ListenAndServe()
}

// Shutdown gracefully shuts down the Match Service
func (ms *MatchService) Shutdown(ctx context.Context) error {
	// Stop accepting new matches
	ms.gameEngine.StopAcceptingMatches()
	
	// Wait for ongoing matches to finish or timeout
	ms.gameEngine.WaitForMatches(ctx)
	
	return ms.server.Shutdown(ctx)
}

// Handler implementations
func (ms *MatchService) handleHealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "match-service",
		"timestamp": time.Now().Unix(),
		"version":   "1.0.0",
		"active_matches": ms.gameEngine.GetActiveMatchCount(),
	})
}

func (ms *MatchService) handleCreateMatch(c *gin.Context) {
	var request struct {
		GameMode    string   `json:"game_mode" binding:"required"`
		PlayerIDs   []string `json:"player_ids" binding:"required"`
		Region      string   `json:"region" binding:"required"`
		Settings    map[string]interface{} `json:"settings,omitempty"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		ms.logger.Warn("Invalid create match request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"code":  "INVALID_REQUEST",
		})
		return
	}
	
	if len(request.PlayerIDs) < 2 || len(request.PlayerIDs) > 8 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Match must have between 2-8 players",
			"code":  "INVALID_PLAYER_COUNT",
		})
		return
	}
	
	// Create match configuration
	matchConfig := &models.Match{
		ID:        generateMatchID(),
		GameMode:  request.GameMode,
		PlayerIDs: request.PlayerIDs,
		Region:    request.Region,
		Status:    "waiting",
		CreatedAt: time.Now(),
		Settings:  request.Settings,
	}
	
	// Create match using game engine
	match, err := ms.gameEngine.CreateMatch(c.Request.Context(), matchConfig)
	
	if err != nil {
		ms.logger.Error("Failed to create match",
			zap.String("game_mode", request.GameMode),
			zap.Strings("player_ids", request.PlayerIDs),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create match",
			"code":  "MATCH_CREATION_FAILED",
		})
		return
	}
	
	ms.logger.Info("Match created successfully",
		zap.String("match_id", match.ID),
		zap.String("game_mode", request.GameMode),
		zap.Int("player_count", len(request.PlayerIDs)))
	
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Match created successfully",
		"match": gin.H{
			"id":          match.ID,
			"game_mode":   match.GameMode,
			"status":      match.Status,
			"player_ids":  match.PlayerIDs,
			"region":      match.Region,
			"created_at":  match.CreatedAt.Unix(),
			"settings":    match.Settings,
		},
	})
}

func (ms *MatchService) handleGetMatch(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ms *MatchService) handleUpdateMatch(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ms *MatchService) handleDeleteMatch(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ms *MatchService) handleGetMatchState(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ms *MatchService) handleUpdateMatchState(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ms *MatchService) handleGameAction(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ms *MatchService) handleProcessTurn(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ms *MatchService) handleEndMatch(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ms *MatchService) handleGetUserMatches(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ms *MatchService) handleGetMatchHistory(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ms *MatchService) handleMatchWebSocket(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "WebSocket not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

// generateMatchID creates a unique match ID
func generateMatchID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return "match_" + hex.EncodeToString(bytes)
}
