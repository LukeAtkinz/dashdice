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
	
	// Initialize Presence Service
	server := NewPresenceService(cfg, logger, dbManager)
	
	// Start server
	logger.Info("Starting Presence Service", 
		zap.String("address", cfg.PresenceServiceAddr),
		zap.String("environment", cfg.Environment))
	
	go func() {
		if err := server.Start(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start Presence Service", zap.Error(err))
		}
	}()
	
	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	
	logger.Info("Shutting down Presence Service...")
	
	// Graceful shutdown with timeout
	ctx, cancel = context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("Presence Service forced to shutdown", zap.Error(err))
	}
	
	logger.Info("Presence Service stopped")
}

// PresenceService handles user presence and WebSocket connections
type PresenceService struct {
	config    *config.Config
	logger    *zap.Logger
	dbManager database.DatabaseManager
	server    *http.Server
	engine    *gin.Engine
	
	// WebSocket management
	wsManager *WebSocketManager
	
	// Presence management
	presenceManager *PresenceManager
}

// NewPresenceService creates a new Presence Service instance
func NewPresenceService(cfg *config.Config, logger *zap.Logger, dbManager database.DatabaseManager) *PresenceService {
	// Set Gin mode based on environment
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	
	service := &PresenceService{
		config:          cfg,
		logger:          logger,
		dbManager:       dbManager,
		engine:          gin.New(),
		wsManager:       NewWebSocketManager(logger, dbManager),
		presenceManager: NewPresenceManager(logger, dbManager),
	}
	
	service.setupMiddleware()
	service.setupRoutes()
	
	return service
}

// setupMiddleware configures middleware for the Presence Service
func (ps *PresenceService) setupMiddleware() {
	// Recovery middleware
	ps.engine.Use(middleware.RecoveryMiddleware(ps.logger))
	
	// Request ID middleware
	ps.engine.Use(middleware.RequestIDMiddleware(ps.logger))
	
	// Logging middleware
	ps.engine.Use(middleware.LoggingMiddleware(ps.logger))
	
	// Rate limiting
	ps.engine.Use(middleware.UserRateLimiter(50, 100, ps.logger))
}

// setupRoutes configures routes for the Presence Service
func (ps *PresenceService) setupRoutes() {
	// Health check
	ps.engine.GET("/health", ps.handleHealthCheck)
	
	// WebSocket endpoint
	ps.engine.GET("/ws", ps.handleWebSocketUpgrade)
	
	// Internal API for other services
	internal := ps.engine.Group("/internal")
	{
		// Presence management
		internal.POST("/presence/:userId", ps.handleUpdatePresence)
		internal.DELETE("/presence/:userId", ps.handleRemovePresence)
		internal.GET("/presence/:userId", ps.handleGetPresence)
		internal.GET("/presence", ps.handleListPresence)
		
		// Connection management
		internal.GET("/connections", ps.handleListConnections)
		internal.GET("/connections/:userId", ps.handleGetUserConnections)
		internal.DELETE("/connections/:userId", ps.handleDisconnectUser)
		
		// Broadcasting
		internal.POST("/broadcast", ps.handleBroadcast)
		internal.POST("/broadcast/user/:userId", ps.handleBroadcastToUser)
		internal.POST("/broadcast/match/:matchId", ps.handleBroadcastToMatch)
		
		// Statistics
		internal.GET("/stats", ps.handleGetStats)
		internal.GET("/stats/connections", ps.handleGetConnectionStats)
	}
}

// Start starts the Presence Service
func (ps *PresenceService) Start() error {
	// Start WebSocket manager
	ps.wsManager.Start()
	
	// Start presence manager
	ps.presenceManager.Start()
	
	ps.server = &http.Server{
		Addr:           ps.config.PresenceServiceAddr,
		Handler:        ps.engine,
		ReadTimeout:    30 * time.Second,
		WriteTimeout:   30 * time.Second,
		IdleTimeout:    120 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1MB
	}
	
	return ps.server.ListenAndServe()
}

// Shutdown gracefully shuts down the Presence Service
func (ps *PresenceService) Shutdown(ctx context.Context) error {
	// Stop managers
	ps.wsManager.Stop()
	ps.presenceManager.Stop()
	
	return ps.server.Shutdown(ctx)
}

// Handler implementations
func (ps *PresenceService) handleHealthCheck(c *gin.Context) {
	stats := ps.wsManager.GetStats()
	
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "presence-service",
		"timestamp": time.Now().Unix(),
		"version":   "1.0.0",
		"stats":     stats,
	})
}

func (ps *PresenceService) handleWebSocketUpgrade(c *gin.Context) {
	// WebSocket upgrade will be implemented
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "WebSocket not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ps *PresenceService) handleUpdatePresence(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ps *PresenceService) handleRemovePresence(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ps *PresenceService) handleGetPresence(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ps *PresenceService) handleListPresence(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ps *PresenceService) handleListConnections(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ps *PresenceService) handleGetUserConnections(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ps *PresenceService) handleDisconnectUser(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ps *PresenceService) handleBroadcast(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ps *PresenceService) handleBroadcastToUser(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ps *PresenceService) handleBroadcastToMatch(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ps *PresenceService) handleGetStats(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (ps *PresenceService) handleGetConnectionStats(c *gin.Context) {
	// Implementation will be added
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}
