package main

import (
	"context"
	"log"
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

// NotificationServer represents the notification service
type NotificationServer struct {
	router            *gin.Engine
	logger            *zap.Logger
	dbManager         database.DatabaseManager
	notificationEngine *NotificationEngine
	server            *http.Server
}

// NotificationRequest represents a notification request
type NotificationRequest struct {
	UserID      string                 `json:"user_id" binding:"required"`
	Type        string                 `json:"type" binding:"required"`
	Title       string                 `json:"title" binding:"required"`
	Message     string                 `json:"message" binding:"required"`
	Data        map[string]interface{} `json:"data,omitempty"`
	Priority    string                 `json:"priority,omitempty"`
	SendAt      *time.Time             `json:"send_at,omitempty"`
	ExpiresAt   *time.Time             `json:"expires_at,omitempty"`
}

// BulkNotificationRequest represents a bulk notification request
type BulkNotificationRequest struct {
	UserIDs     []string               `json:"user_ids" binding:"required"`
	Type        string                 `json:"type" binding:"required"`
	Title       string                 `json:"title" binding:"required"`
	Message     string                 `json:"message" binding:"required"`
	Data        map[string]interface{} `json:"data,omitempty"`
	Priority    string                 `json:"priority,omitempty"`
	SendAt      *time.Time             `json:"send_at,omitempty"`
	ExpiresAt   *time.Time             `json:"expires_at,omitempty"`
}

// BroadcastNotificationRequest represents a broadcast notification request
type BroadcastNotificationRequest struct {
	Audience    string                 `json:"audience" binding:"required"` // "all", "online", "segment"
	Segment     map[string]interface{} `json:"segment,omitempty"`
	Type        string                 `json:"type" binding:"required"`
	Title       string                 `json:"title" binding:"required"`
	Message     string                 `json:"message" binding:"required"`
	Data        map[string]interface{} `json:"data,omitempty"`
	Priority    string                 `json:"priority,omitempty"`
	SendAt      *time.Time             `json:"send_at,omitempty"`
	ExpiresAt   *time.Time             `json:"expires_at,omitempty"`
}

// NotificationResponse represents a notification response
type NotificationResponse struct {
	Success         bool     `json:"success"`
	NotificationID  string   `json:"notification_id,omitempty"`
	NotificationIDs []string `json:"notification_ids,omitempty"`
	Message         string   `json:"message"`
	FailedUsers     []string `json:"failed_users,omitempty"`
}

// NewNotificationServer creates a new notification server
func NewNotificationServer() *NotificationServer {
	// Initialize logger
	logger, _ := zap.NewProduction()

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database manager
	dbManager := database.NewDatabaseManager(cfg, logger)

	// Initialize notification engine
	notificationEngine := NewNotificationEngine(logger, dbManager)

	// Setup Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger(logger))
	router.Use(middleware.CORS())
	router.Use(middleware.RateLimit())

	ns := &NotificationServer{
		router:            router,
		logger:            logger,
		dbManager:         dbManager,
		notificationEngine: notificationEngine,
	}

	// Setup routes
	ns.setupRoutes()

	return ns
}

// setupRoutes configures the server routes
func (ns *NotificationServer) setupRoutes() {
	// Health check
	ns.router.GET("/health", ns.healthCheck)
	ns.router.GET("/ready", ns.readinessCheck)

	// API version group
	v1 := ns.router.Group("/api/v1")
	v1.Use(middleware.Auth())

	// Single notification endpoints
	v1.POST("/notifications/send", ns.sendNotification)
	v1.GET("/notifications/:id", ns.getNotification)
	v1.DELETE("/notifications/:id", ns.cancelNotification)

	// Bulk notification endpoints
	v1.POST("/notifications/bulk", ns.sendBulkNotifications)
	v1.POST("/notifications/broadcast", ns.broadcastNotification)

	// User notification endpoints
	v1.GET("/users/:user_id/notifications", ns.getUserNotifications)
	v1.PUT("/users/:user_id/notifications/:notification_id/read", ns.markNotificationRead)
	v1.PUT("/users/:user_id/notifications/read-all", ns.markAllNotificationsRead)
	v1.DELETE("/users/:user_id/notifications/:notification_id", ns.deleteUserNotification)

	// Device/push token management
	v1.POST("/users/:user_id/devices", ns.registerDevice)
	v1.DELETE("/users/:user_id/devices/:device_id", ns.unregisterDevice)
	v1.GET("/users/:user_id/devices", ns.getUserDevices)

	// Subscription management
	v1.POST("/users/:user_id/subscriptions", ns.updateNotificationSubscriptions)
	v1.GET("/users/:user_id/subscriptions", ns.getNotificationSubscriptions)

	// Template management
	v1.POST("/templates", ns.createNotificationTemplate)
	v1.GET("/templates", ns.getNotificationTemplates)
	v1.PUT("/templates/:template_id", ns.updateNotificationTemplate)
	v1.DELETE("/templates/:template_id", ns.deleteNotificationTemplate)

	// Analytics and stats
	v1.GET("/stats/notifications", ns.getNotificationStats)
	v1.GET("/stats/delivery", ns.getDeliveryStats)

	// Admin endpoints
	admin := v1.Group("/admin")
	admin.Use(middleware.AdminAuth())
	{
		admin.GET("/notifications", ns.getAllNotifications)
		admin.GET("/users/:user_id/notification-history", ns.getUserNotificationHistory)
		admin.POST("/system/broadcast", ns.systemBroadcast)
		admin.GET("/system/stats", ns.getSystemStats)
	}
}

// HTTP Handlers

// healthCheck handles health check requests
func (ns *NotificationServer) healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "notification-service",
		"timestamp": time.Now(),
	})
}

// readinessCheck handles readiness check requests
func (ns *NotificationServer) readinessCheck(c *gin.Context) {
	// Check dependencies
	healthChecks, err := ns.dbManager.HealthCheck(c.Request.Context())
	if err != nil || healthChecks == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "not ready",
			"reason": "database not available",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "ready",
		"service":   "notification-service",
		"timestamp": time.Now(),
	})
}

// sendNotification handles single notification sending
func (ns *NotificationServer) sendNotification(c *gin.Context) {
	var req NotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Send notification
	notification, err := ns.notificationEngine.SendNotification(c.Request.Context(), &req)
	if err != nil {
		ns.logger.Error("Failed to send notification", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send notification"})
		return
	}

	c.JSON(http.StatusOK, NotificationResponse{
		Success:        true,
		NotificationID: notification.ID,
		Message:        "Notification sent successfully",
	})
}

// sendBulkNotifications handles bulk notification sending
func (ns *NotificationServer) sendBulkNotifications(c *gin.Context) {
	var req BulkNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Send bulk notifications
	results, err := ns.notificationEngine.SendBulkNotifications(c.Request.Context(), &req)
	if err != nil {
		ns.logger.Error("Failed to send bulk notifications", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send bulk notifications"})
		return
	}

	var notificationIDs []string
	var failedUsers []string

	for _, result := range results {
		if result.Success {
			notificationIDs = append(notificationIDs, result.NotificationID)
		} else {
			failedUsers = append(failedUsers, result.UserID)
		}
	}

	c.JSON(http.StatusOK, NotificationResponse{
		Success:         len(failedUsers) == 0,
		NotificationIDs: notificationIDs,
		Message:         "Bulk notifications processed",
		FailedUsers:     failedUsers,
	})
}

// broadcastNotification handles broadcast notification sending
func (ns *NotificationServer) broadcastNotification(c *gin.Context) {
	var req BroadcastNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Send broadcast notification
	result, err := ns.notificationEngine.SendBroadcastNotification(c.Request.Context(), &req)
	if err != nil {
		ns.logger.Error("Failed to send broadcast notification", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send broadcast notification"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// getNotification handles retrieving a specific notification
func (ns *NotificationServer) getNotification(c *gin.Context) {
	notificationID := c.Param("id")
	
	notification, err := ns.notificationEngine.GetNotification(c.Request.Context(), notificationID)
	if err != nil {
		ns.logger.Error("Failed to get notification", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	c.JSON(http.StatusOK, notification)
}

// cancelNotification handles canceling a pending notification
func (ns *NotificationServer) cancelNotification(c *gin.Context) {
	notificationID := c.Param("id")
	
	err := ns.notificationEngine.CancelNotification(c.Request.Context(), notificationID)
	if err != nil {
		ns.logger.Error("Failed to cancel notification", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Notification cancelled"})
}

// getUserNotifications handles retrieving user notifications
func (ns *NotificationServer) getUserNotifications(c *gin.Context) {
	userID := c.Param("user_id")
	
	// Parse query parameters
	limit := 20 // default
	offset := 0 // default
	unreadOnly := c.Query("unread_only") == "true"
	
	notifications, err := ns.notificationEngine.GetUserNotifications(
		c.Request.Context(), userID, limit, offset, unreadOnly)
	if err != nil {
		ns.logger.Error("Failed to get user notifications", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"notifications": notifications,
		"total":         len(notifications),
	})
}

// markNotificationRead handles marking a notification as read
func (ns *NotificationServer) markNotificationRead(c *gin.Context) {
	userID := c.Param("user_id")
	notificationID := c.Param("notification_id")
	
	err := ns.notificationEngine.MarkNotificationRead(c.Request.Context(), userID, notificationID)
	if err != nil {
		ns.logger.Error("Failed to mark notification read", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notification read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Notification marked as read"})
}

// markAllNotificationsRead handles marking all notifications as read for a user
func (ns *NotificationServer) markAllNotificationsRead(c *gin.Context) {
	userID := c.Param("user_id")
	
	err := ns.notificationEngine.MarkAllNotificationsRead(c.Request.Context(), userID)
	if err != nil {
		ns.logger.Error("Failed to mark all notifications read", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark all notifications read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "All notifications marked as read"})
}

// deleteUserNotification handles deleting a user notification
func (ns *NotificationServer) deleteUserNotification(c *gin.Context) {
	userID := c.Param("user_id")
	notificationID := c.Param("notification_id")
	
	err := ns.notificationEngine.DeleteUserNotification(c.Request.Context(), userID, notificationID)
	if err != nil {
		ns.logger.Error("Failed to delete user notification", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Notification deleted"})
}

// registerDevice handles device registration for push notifications
func (ns *NotificationServer) registerDevice(c *gin.Context) {
	userID := c.Param("user_id")
	
	var device models.Device
	if err := c.ShouldBindJSON(&device); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	device.UserID = userID
	
	err := ns.notificationEngine.RegisterDevice(c.Request.Context(), &device)
	if err != nil {
		ns.logger.Error("Failed to register device", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register device"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Device registered successfully"})
}

// unregisterDevice handles device unregistration
func (ns *NotificationServer) unregisterDevice(c *gin.Context) {
	userID := c.Param("user_id")
	deviceID := c.Param("device_id")
	
	err := ns.notificationEngine.UnregisterDevice(c.Request.Context(), userID, deviceID)
	if err != nil {
		ns.logger.Error("Failed to unregister device", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unregister device"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Device unregistered successfully"})
}

// getUserDevices handles retrieving user devices
func (ns *NotificationServer) getUserDevices(c *gin.Context) {
	userID := c.Param("user_id")
	
	devices, err := ns.notificationEngine.GetUserDevices(c.Request.Context(), userID)
	if err != nil {
		ns.logger.Error("Failed to get user devices", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get devices"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"devices": devices})
}

// Placeholder handlers for remaining endpoints
func (ns *NotificationServer) updateNotificationSubscriptions(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "NOT_IMPLEMENTED"})
}

func (ns *NotificationServer) getNotificationSubscriptions(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "NOT_IMPLEMENTED"})
}

func (ns *NotificationServer) createNotificationTemplate(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "NOT_IMPLEMENTED"})
}

func (ns *NotificationServer) getNotificationTemplates(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "NOT_IMPLEMENTED"})
}

func (ns *NotificationServer) updateNotificationTemplate(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "NOT_IMPLEMENTED"})
}

func (ns *NotificationServer) deleteNotificationTemplate(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "NOT_IMPLEMENTED"})
}

func (ns *NotificationServer) getNotificationStats(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "NOT_IMPLEMENTED"})
}

func (ns *NotificationServer) getDeliveryStats(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "NOT_IMPLEMENTED"})
}

func (ns *NotificationServer) getAllNotifications(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "NOT_IMPLEMENTED"})
}

func (ns *NotificationServer) getUserNotificationHistory(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "NOT_IMPLEMENTED"})
}

func (ns *NotificationServer) systemBroadcast(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "NOT_IMPLEMENTED"})
}

func (ns *NotificationServer) getSystemStats(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "NOT_IMPLEMENTED"})
}

// Start starts the notification server
func (ns *NotificationServer) Start(port string) error {
	// Start the notification engine
	ns.notificationEngine.Start()

	ns.server = &http.Server{
		Addr:    ":" + port,
		Handler: ns.router,
	}

	ns.logger.Info("Starting notification server", zap.String("port", port))
	return ns.server.ListenAndServe()
}

// Stop stops the notification server gracefully
func (ns *NotificationServer) Stop() error {
	// Stop the notification engine
	ns.notificationEngine.Stop()

	if ns.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		return ns.server.Shutdown(ctx)
	}
	return nil
}

func main() {
	// Create notification server
	server := NewNotificationServer()
	defer server.dbManager.Close()

	// Setup graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		server.logger.Info("Shutting down notification server...")
		if err := server.Stop(); err != nil {
			server.logger.Error("Server shutdown error", zap.Error(err))
		}
		os.Exit(0)
	}()

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8084"
	}

	if err := server.Start(port); err != nil && err != http.ErrServerClosed {
		server.logger.Fatal("Server startup failed", zap.Error(err))
	}
}
