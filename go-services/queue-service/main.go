package main

import (
	"context"
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
	
	// Initialize Queue Service
	server := NewQueueService(cfg, logger, dbManager)
	
	// Start server
	logger.Info("Starting Queue Service", 
		zap.String("address", cfg.QueueServiceAddr),
		zap.String("environment", cfg.Environment))
	
	go func() {
		if err := server.Start(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start Queue Service", zap.Error(err))
		}
	}()
	
	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	
	logger.Info("Shutting down Queue Service...")
	
	// Graceful shutdown with timeout
	ctx, cancel = context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("Queue Service forced to shutdown", zap.Error(err))
	}
	
	logger.Info("Queue Service stopped")
}

// QueueService handles matchmaking and queue management
type QueueService struct {
	config    *config.Config
	logger    *zap.Logger
	dbManager database.DatabaseManager
	server    *http.Server
	engine    *gin.Engine
	
	// Matchmaking components
	matchmaker *Matchmaker
}

// NewQueueService creates a new Queue Service instance
func NewQueueService(cfg *config.Config, logger *zap.Logger, dbManager database.DatabaseManager) *QueueService {
	// Set Gin mode based on environment
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	
	service := &QueueService{
		config:     cfg,
		logger:     logger,
		dbManager:  dbManager,
		engine:     gin.New(),
		matchmaker: NewMatchmaker(logger, dbManager),
	}
	
	service.setupMiddleware()
	service.setupRoutes()
	
	return service
}

// setupMiddleware configures middleware for the Queue Service
func (qs *QueueService) setupMiddleware() {
	// Recovery middleware
	qs.engine.Use(middleware.RecoveryMiddleware(qs.logger))
	
	// Request ID middleware
	qs.engine.Use(middleware.RequestIDMiddleware(qs.logger))
	
	// Logging middleware
	qs.engine.Use(middleware.LoggingMiddleware(qs.logger))
	
	// Rate limiting for queue operations
	qs.engine.Use(middleware.UserRateLimiter(20, 40, qs.logger))
}

// setupRoutes configures routes for the Queue Service
func (qs *QueueService) setupRoutes() {
	// Health check
	qs.engine.GET("/health", qs.handleHealthCheck)
	
	// Internal API for other services
	internal := qs.engine.Group("/internal")
	{
		// Queue management
		internal.POST("/queue/:gameMode/join", qs.handleJoinQueue)
		internal.DELETE("/queue/:gameMode/leave", qs.handleLeaveQueue)
		internal.GET("/queue/:gameMode/status", qs.handleGetQueueStatus)
		internal.GET("/queue/:gameMode/position", qs.handleGetQueuePosition)
		
		// Queue administration
		internal.GET("/queues", qs.handleListQueues)
		internal.DELETE("/queues/:gameMode/clear", qs.handleClearQueue)
		internal.POST("/queues/:gameMode/force-match", qs.handleForceMatch)
		
		// Player management
		internal.GET("/players/:userId/queues", qs.handleGetPlayerQueues)
		internal.DELETE("/players/:userId/queues", qs.handleRemovePlayerFromAllQueues)
		
		// Matchmaking stats
		internal.GET("/stats/matchmaking", qs.handleGetMatchmakingStats)
		internal.GET("/stats/queues", qs.handleGetQueueStats)
	}
}

// Start starts the Queue Service
func (qs *QueueService) Start() error {
	// Start matchmaking engine
	qs.matchmaker.Start()
	
	qs.server = &http.Server{
		Addr:           qs.config.QueueServiceAddr,
		Handler:        qs.engine,
		ReadTimeout:    30 * time.Second,
		WriteTimeout:   30 * time.Second,
		IdleTimeout:    120 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1MB
	}
	
	return qs.server.ListenAndServe()
}

// Shutdown gracefully shuts down the Queue Service
func (qs *QueueService) Shutdown(ctx context.Context) error {
	// Stop matchmaking engine
	qs.matchmaker.Stop()
	
	return qs.server.Shutdown(ctx)
}

// Handler implementations
func (qs *QueueService) handleHealthCheck(c *gin.Context) {
	stats := qs.matchmaker.GetStats()
	
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "queue-service",
		"timestamp": time.Now().Unix(),
		"version":   "1.0.0",
		"stats":     stats,
	})
}

func (qs *QueueService) handleJoinQueue(c *gin.Context) {
	gameMode := c.Param("gameMode")
	
	var request struct {
		UserID    string `json:"user_id" binding:"required"`
		Region    string `json:"region" binding:"required"`
		EloRating int    `json:"elo_rating"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		qs.logger.Warn("Invalid join queue request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"code":  "INVALID_REQUEST",
		})
		return
	}
	
	// Create queue player
	queuePlayer := &models.QueuePlayer{
		UserID:     request.UserID,
		GameMode:   gameMode,
		Region:     request.Region,
		ELO:        request.EloRating, // Note: struct field is ELO but request has EloRating
		JoinedAt:   time.Now(),
	}
	
	// Join queue through matchmaker
	if err := qs.matchmaker.AddPlayerToQueue(c.Request.Context(), gameMode, queuePlayer); err != nil {
		qs.logger.Error("Failed to join queue", 
			zap.String("user_id", request.UserID),
			zap.String("game_mode", gameMode),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to join queue",
			"code":  "QUEUE_JOIN_FAILED",
		})
		return
	}
	
	qs.logger.Info("Player joined queue",
		zap.String("user_id", request.UserID),
		zap.String("game_mode", gameMode),
		zap.String("region", request.Region))
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Successfully joined queue",
		"queue": gin.H{
			"game_mode": gameMode,
			"region": request.Region,
			"joined_at": queuePlayer.JoinedAt.Unix(),
		},
	})
}

func (qs *QueueService) handleLeaveQueue(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (qs *QueueService) handleGetQueueStatus(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (qs *QueueService) handleGetQueuePosition(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (qs *QueueService) handleListQueues(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (qs *QueueService) handleClearQueue(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (qs *QueueService) handleForceMatch(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (qs *QueueService) handleGetPlayerQueues(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (qs *QueueService) handleRemovePlayerFromAllQueues(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (qs *QueueService) handleGetMatchmakingStats(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (qs *QueueService) handleGetQueueStats(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}
