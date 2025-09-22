package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
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

	// Initialize Bot AI Service
	server := NewBotAIService(cfg, logger, dbManager)

	// Start server
	logger.Info("Starting Bot AI Service",
		zap.String("address", cfg.BotServiceAddr),
		zap.String("environment", cfg.Environment))

	go func() {
		if err := server.Start(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start Bot AI Service", zap.Error(err))
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down Bot AI Service...")

	// Graceful shutdown with timeout
	ctx, cancel = context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Error("Bot AI Service forced to shutdown", zap.Error(err))
	}

	logger.Info("Bot AI Service stopped")
}

// BotAIService handles bot AI logic and WebSocket communication
type BotAIService struct {
	config    *config.Config
	logger    *zap.Logger
	dbManager database.DatabaseManager
	server    *http.Server
	engine    *gin.Engine

	// Bot management
	activeBots   map[string]*BotSession
	botsMutex    sync.RWMutex
	upgrader     websocket.Upgrader
}

// BotSession represents an active bot in a game
type BotSession struct {
	BotID       string
	MatchID     string
	GameMode    string
	PlayerID    string // Human player ID
	Profile     *BotProfile
	AIEngine    *BotAIEngine
	Connection  *websocket.Conn
	LastAction  time.Time
	IsActive    bool
	mutex       sync.Mutex
}

// BotProfile represents bot configuration and personality
type BotProfile struct {
	ID          string                 `json:"id"`
	DisplayName string                 `json:"displayName"`
	Username    string                 `json:"username"`
	PhotoURL    string                 `json:"photoURL"`
	Stats       BotStats               `json:"stats"`
	Personality map[string]interface{} `json:"personality"`
	Emotional   map[string]interface{} `json:"emotionalState"`
	Config      BotConfig              `json:"botConfig"`
}

// BotStats represents bot performance statistics
type BotStats struct {
	ELO         int    `json:"elo"`
	GamesPlayed int    `json:"gamesPlayed"`
	MatchWins   int    `json:"matchWins"`
	WinRate     float64 `json:"winRate"`
	Rank        string `json:"rank"`
}

// BotConfig represents bot behavior configuration
type BotConfig struct {
	SkillLevel       string `json:"skillLevel"`
	Region           string `json:"region"`
	IsActive         bool   `json:"isActive"`
	MinResponseTime  int    `json:"minResponseTime"`  // milliseconds
	MaxResponseTime  int    `json:"maxResponseTime"`  // milliseconds
	ErrorRate        float64 `json:"errorRate"`       // 0.0 to 1.0
}

// GameAction represents an action in the game
type GameAction struct {
	Type      string      `json:"type"`
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
	PlayerID  string      `json:"playerId"`
}

// DiceRollAction represents a dice roll action
type DiceRollAction struct {
	Dice   []int `json:"dice"`
	Turn   int   `json:"turn"`
	Score  int   `json:"score"`
}

// BankAction represents a bank action
type BankAction struct {
	Score int `json:"score"`
	Turn  int `json:"turn"`
}

// NewBotAIService creates a new Bot AI Service instance
func NewBotAIService(cfg *config.Config, logger *zap.Logger, dbManager database.DatabaseManager) *BotAIService {
	// Set Gin mode based on environment
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	service := &BotAIService{
		config:     cfg,
		logger:     logger,
		dbManager:  dbManager,
		engine:     gin.New(),
		activeBots: make(map[string]*BotSession),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins in development
			},
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
	}

	service.setupMiddleware()
	service.setupRoutes()

	return service
}

// setupMiddleware configures middleware for the Bot AI Service
func (bas *BotAIService) setupMiddleware() {
	// Recovery middleware
	bas.engine.Use(middleware.RecoveryMiddleware(bas.logger))

	// Request ID middleware
	bas.engine.Use(middleware.RequestIDMiddleware(bas.logger))

	// Logging middleware
	bas.engine.Use(middleware.LoggingMiddleware(bas.logger))

	// Rate limiting
	bas.engine.Use(middleware.UserRateLimiter(10, 20, bas.logger))
}

// setupRoutes configures routes for the Bot AI Service
func (bas *BotAIService) setupRoutes() {
	// Health check
	bas.engine.GET("/health", bas.handleHealthCheck)

	// Internal API for other services
	internal := bas.engine.Group("/internal")
	{
		// Bot management
		internal.POST("/bots/:botId/start", bas.handleStartBot)
		internal.POST("/bots/:botId/stop", bas.handleStopBot)
		internal.GET("/bots/:botId/status", bas.handleGetBotStatus)
		internal.GET("/bots/active", bas.handleGetActiveBots)

		// Game actions
		internal.POST("/bots/:botId/action", bas.handleBotAction)
		internal.GET("/bots/:botId/state", bas.handleGetBotState)

		// Statistics and monitoring
		internal.GET("/stats", bas.handleGetStats)
	}

	// WebSocket endpoint for bot communication
	bas.engine.GET("/ws/:botId", bas.handleWebSocket)
}

// Start starts the Bot AI Service
func (bas *BotAIService) Start() error {
	// Start bot management background tasks
	go bas.botCleanupLoop()
	go bas.botHeartbeatLoop()

	bas.server = &http.Server{
		Addr:           bas.config.BotServiceAddr,
		Handler:        bas.engine,
		ReadTimeout:    30 * time.Second,
		WriteTimeout:   30 * time.Second,
		IdleTimeout:    120 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1MB
	}

	return bas.server.ListenAndServe()
}

// Shutdown gracefully shuts down the Bot AI Service
func (bas *BotAIService) Shutdown(ctx context.Context) error {
	// Stop all active bots
	bas.stopAllBots()

	return bas.server.Shutdown(ctx)
}

// Handler implementations

func (bas *BotAIService) handleHealthCheck(c *gin.Context) {
	bas.botsMutex.RLock()
	activeCount := len(bas.activeBots)
	bas.botsMutex.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"status":      "healthy",
		"service":     "bot-ai-service",
		"timestamp":   time.Now().Unix(),
		"version":     "1.0.0",
		"active_bots": activeCount,
	})
}

func (bas *BotAIService) handleStartBot(c *gin.Context) {
	botID := c.Param("botId")

	var request struct {
		MatchID   string `json:"match_id" binding:"required"`
		GameMode  string `json:"game_mode" binding:"required"`
		PlayerID  string `json:"player_id" binding:"required"`
		WSUrl     string `json:"ws_url"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		bas.logger.Warn("Invalid start bot request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	// Load bot profile from database
	profile, err := bas.loadBotProfile(c.Request.Context(), botID)
	if err != nil {
		bas.logger.Error("Failed to load bot profile",
			zap.String("bot_id", botID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to load bot profile",
			"code":  "PROFILE_LOAD_FAILED",
		})
		return
	}

	// Create bot session
	session := &BotSession{
		BotID:      botID,
		MatchID:    request.MatchID,
		GameMode:   request.GameMode,
		PlayerID:   request.PlayerID,
		Profile:    profile,
		AIEngine:   NewBotAIEngine(profile, bas.logger),
		LastAction: time.Now(),
		IsActive:   true,
	}

	// Add to active bots
	bas.botsMutex.Lock()
	bas.activeBots[botID] = session
	bas.botsMutex.Unlock()

	bas.logger.Info("🤖 Bot started",
		zap.String("bot_id", botID),
		zap.String("match_id", request.MatchID),
		zap.String("game_mode", request.GameMode),
		zap.String("opponent", request.PlayerID))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Bot started successfully",
		"bot": gin.H{
			"id":          botID,
			"match_id":    request.MatchID,
			"game_mode":   request.GameMode,
			"display_name": profile.DisplayName,
			"skill_level": profile.Config.SkillLevel,
		},
	})
}

func (bas *BotAIService) handleStopBot(c *gin.Context) {
	botID := c.Param("botId")

	bas.botsMutex.Lock()
	session, exists := bas.activeBots[botID]
	if exists {
		session.IsActive = false
		delete(bas.activeBots, botID)
	}
	bas.botsMutex.Unlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Bot not found",
			"code":  "BOT_NOT_FOUND",
		})
		return
	}

	// Close WebSocket connection if exists
	if session.Connection != nil {
		session.Connection.Close()
	}

	bas.logger.Info("🤖 Bot stopped", zap.String("bot_id", botID))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Bot stopped successfully",
	})
}

func (bas *BotAIService) handleGetBotStatus(c *gin.Context) {
	botID := c.Param("botId")

	bas.botsMutex.RLock()
	session, exists := bas.activeBots[botID]
	bas.botsMutex.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Bot not found",
			"code":  "BOT_NOT_FOUND",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"bot_id":      session.BotID,
		"match_id":    session.MatchID,
		"game_mode":   session.GameMode,
		"is_active":   session.IsActive,
		"last_action": session.LastAction.Unix(),
		"uptime":      time.Since(session.LastAction).Seconds(),
	})
}

func (bas *BotAIService) handleGetActiveBots(c *gin.Context) {
	bas.botsMutex.RLock()
	activeBots := make([]gin.H, 0, len(bas.activeBots))
	for botID, session := range bas.activeBots {
		activeBots = append(activeBots, gin.H{
			"bot_id":      botID,
			"match_id":    session.MatchID,
			"game_mode":   session.GameMode,
			"is_active":   session.IsActive,
			"last_action": session.LastAction.Unix(),
		})
	}
	bas.botsMutex.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"active_bots": activeBots,
		"count":       len(activeBots),
	})
}

func (bas *BotAIService) handleBotAction(c *gin.Context) {
	botID := c.Param("botId")

	var gameState struct {
		CurrentPlayer string      `json:"currentPlayer"`
		GameData      interface{} `json:"gameData"`
		ActionType    string      `json:"actionType"`
	}

	if err := c.ShouldBindJSON(&gameState); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid game state",
			"code":  "INVALID_GAME_STATE",
		})
		return
	}

	bas.botsMutex.RLock()
	session, exists := bas.activeBots[botID]
	bas.botsMutex.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Bot not found",
			"code":  "BOT_NOT_FOUND",
		})
		return
	}

	// Generate bot action using AI engine
	action, err := session.AIEngine.MakeDecision(gameState.GameData, gameState.ActionType)
	if err != nil {
		bas.logger.Error("🤖 Failed to generate bot action",
			zap.String("bot_id", botID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate action",
			"code":  "ACTION_GENERATION_FAILED",
		})
		return
	}

	// Add realistic delay based on bot configuration
	delay := bas.calculateResponseDelay(session.Profile)
	time.Sleep(delay)

	session.LastAction = time.Now()

	bas.logger.Info("🤖 Bot action generated",
		zap.String("bot_id", botID),
		zap.String("action_type", action.Type),
		zap.Duration("delay", delay))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"action":  action,
		"delay":   delay.Milliseconds(),
	})
}

func (bas *BotAIService) handleGetBotState(c *gin.Context) {
	// Implementation for getting bot internal state
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Not implemented yet",
		"code":  "NOT_IMPLEMENTED",
	})
}

func (bas *BotAIService) handleGetStats(c *gin.Context) {
	bas.botsMutex.RLock()
	activeCount := len(bas.activeBots)
	bas.botsMutex.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"active_bots":    activeCount,
		"total_sessions": activeCount, // Could track historical sessions
		"uptime":         time.Now().Unix(),
	})
}

// WebSocket handler for real-time bot communication
func (bas *BotAIService) handleWebSocket(c *gin.Context) {
	botID := c.Param("botId")

	// Upgrade connection to WebSocket
	conn, err := bas.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		bas.logger.Error("🤖 Failed to upgrade WebSocket connection",
			zap.String("bot_id", botID),
			zap.Error(err))
		return
	}
	defer conn.Close()

	// Get bot session
	bas.botsMutex.RLock()
	session, exists := bas.activeBots[botID]
	bas.botsMutex.RUnlock()

	if !exists {
		bas.logger.Warn("🤖 WebSocket connection for unknown bot", zap.String("bot_id", botID))
		conn.WriteJSON(map[string]interface{}{
			"error": "Bot not found",
			"code":  "BOT_NOT_FOUND",
		})
		return
	}

	// Update session with WebSocket connection
	session.mutex.Lock()
	session.Connection = conn
	session.mutex.Unlock()

	bas.logger.Info("🤖 WebSocket connected", zap.String("bot_id", botID))

	// Handle WebSocket messages
	for {
		var message map[string]interface{}
		err := conn.ReadJSON(&message)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				bas.logger.Error("🤖 WebSocket error", zap.String("bot_id", botID), zap.Error(err))
			}
			break
		}

		// Process game message and generate bot response
		go bas.processWebSocketMessage(session, message)
	}

	// Clean up connection
	session.mutex.Lock()
	session.Connection = nil
	session.mutex.Unlock()

	bas.logger.Info("🤖 WebSocket disconnected", zap.String("bot_id", botID))
}

// Background tasks

func (bas *BotAIService) botCleanupLoop() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		bas.cleanupInactiveBots()
	}
}

func (bas *BotAIService) botHeartbeatLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		bas.sendHeartbeatToActiveBots()
	}
}

// Helper functions

func (bas *BotAIService) loadBotProfile(ctx context.Context, botID string) (*BotProfile, error) {
	// Load bot profile from Firebase
	// This would query the bot_profiles collection
	
	// Mock implementation for now
	return &BotProfile{
		ID:          botID,
		DisplayName: "Bot Player",
		Username:    fmt.Sprintf("bot_%s", botID[:8]),
		PhotoURL:    "",
		Stats: BotStats{
			ELO:         1200,
			GamesPlayed: 100,
			MatchWins:   50,
			WinRate:     0.5,
			Rank:        "Silver",
		},
		Personality: map[string]interface{}{
			"aggressiveness": 0.5,
			"cautiousness":   0.6,
			"riskTolerance":  0.4,
		},
		Config: BotConfig{
			SkillLevel:      "intermediate",
			Region:          "us-east",
			IsActive:        true,
			MinResponseTime: 1000,
			MaxResponseTime: 3000,
			ErrorRate:       0.05,
		},
	}, nil
}

func (bas *BotAIService) calculateResponseDelay(profile *BotProfile) time.Duration {
	min := profile.Config.MinResponseTime
	max := profile.Config.MaxResponseTime
	
	// Add randomness to response time
	delay := min + rand.Intn(max-min)
	
	// Add human-like variance (sometimes faster, sometimes slower)
	variance := rand.Float64() * 0.3 - 0.15 // ±15% variance
	delay = int(float64(delay) * (1.0 + variance))
	
	return time.Duration(delay) * time.Millisecond
}

func (bas *BotAIService) processWebSocketMessage(session *BotSession, message map[string]interface{}) {
	// Process game message and generate appropriate bot response
	if session.Connection == nil || !session.IsActive {
		return
	}

	// Generate response using AI engine
	response, err := session.AIEngine.ProcessMessage(message)
	if err != nil {
		bas.logger.Error("🤖 Failed to process WebSocket message",
			zap.String("bot_id", session.BotID),
			zap.Error(err))
		return
	}

	// Add realistic delay
	delay := bas.calculateResponseDelay(session.Profile)
	time.Sleep(delay)

	// Send response
	session.mutex.Lock()
	if session.Connection != nil {
		err = session.Connection.WriteJSON(response)
		if err != nil {
			bas.logger.Error("🤖 Failed to send WebSocket response",
				zap.String("bot_id", session.BotID),
				zap.Error(err))
		}
	}
	session.mutex.Unlock()
}

func (bas *BotAIService) cleanupInactiveBots() {
	bas.botsMutex.Lock()
	defer bas.botsMutex.Unlock()

	now := time.Now()
	for botID, session := range bas.activeBots {
		// Remove bots inactive for more than 10 minutes
		if !session.IsActive || now.Sub(session.LastAction) > 10*time.Minute {
			if session.Connection != nil {
				session.Connection.Close()
			}
			delete(bas.activeBots, botID)
			bas.logger.Info("🤖 Cleaned up inactive bot", zap.String("bot_id", botID))
		}
	}
}

func (bas *BotAIService) sendHeartbeatToActiveBots() {
	bas.botsMutex.RLock()
	defer bas.botsMutex.RUnlock()

	heartbeat := map[string]interface{}{
		"type":      "heartbeat",
		"timestamp": time.Now().Unix(),
	}

	for botID, session := range bas.activeBots {
		if session.Connection != nil && session.IsActive {
			session.mutex.Lock()
			err := session.Connection.WriteJSON(heartbeat)
			session.mutex.Unlock()
			
			if err != nil {
				bas.logger.Warn("🤖 Failed to send heartbeat",
					zap.String("bot_id", botID),
					zap.Error(err))
			}
		}
	}
}

func (bas *BotAIService) stopAllBots() {
	bas.botsMutex.Lock()
	defer bas.botsMutex.Unlock()

	for botID, session := range bas.activeBots {
		session.IsActive = false
		if session.Connection != nil {
			session.Connection.Close()
		}
		bas.logger.Info("🤖 Stopped bot during shutdown", zap.String("bot_id", botID))
	}

	// Clear all active bots
	bas.activeBots = make(map[string]*BotSession)
}
