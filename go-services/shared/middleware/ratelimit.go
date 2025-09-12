package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"
	
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

// RateLimiter provides rate limiting functionality
type RateLimiter struct {
	clients map[string]*rate.Limiter
	mutex   sync.RWMutex
	
	// Rate limiting configuration
	requestsPerSecond int
	burstSize         int
	
	// Cleanup configuration
	cleanupInterval time.Duration
	clientTimeout   time.Duration
	
	logger *zap.Logger
}

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	RequestsPerSecond int           // Requests per second allowed
	BurstSize         int           // Maximum burst size
	CleanupInterval   time.Duration // How often to cleanup old clients
	ClientTimeout     time.Duration // How long to keep client entries
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(config RateLimitConfig, logger *zap.Logger) *RateLimiter {
	rl := &RateLimiter{
		clients:           make(map[string]*rate.Limiter),
		requestsPerSecond: config.RequestsPerSecond,
		burstSize:         config.BurstSize,
		cleanupInterval:   config.CleanupInterval,
		clientTimeout:     config.ClientTimeout,
		logger:            logger,
	}
	
	// Start cleanup goroutine
	go rl.cleanupRoutine()
	
	return rl
}

// Middleware returns a Gin middleware function for rate limiting
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Get client identifier (IP address or user ID if authenticated)
		clientID := rl.getClientID(c)
		
		// Get or create limiter for this client
		limiter := rl.getLimiter(clientID)
		
		// Check if request is allowed
		if !limiter.Allow() {
			rl.logger.Warn("Rate limit exceeded",
				zap.String("client_id", clientID),
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method))
			
			c.Header("X-RateLimit-Limit", strconv.Itoa(rl.requestsPerSecond))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Second).Unix(), 10))
			
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "Rate limit exceeded",
				"code":    "RATE_LIMIT_EXCEEDED",
				"message": "Too many requests. Please slow down.",
				"retry_after": 1,
			})
			c.Abort()
			return
		}
		
		// Set rate limit headers
		c.Header("X-RateLimit-Limit", strconv.Itoa(rl.requestsPerSecond))
		// Note: Getting remaining tokens from rate.Limiter is not straightforward
		// In production, you might want to use a more sophisticated rate limiter
		
		c.Next()
	})
}

// getLimiter gets or creates a rate limiter for a client
func (rl *RateLimiter) getLimiter(clientID string) *rate.Limiter {
	rl.mutex.RLock()
	limiter, exists := rl.clients[clientID]
	rl.mutex.RUnlock()
	
	if exists {
		return limiter
	}
	
	// Create new limiter
	rl.mutex.Lock()
	defer rl.mutex.Unlock()
	
	// Double-check in case another goroutine created it
	if limiter, exists := rl.clients[clientID]; exists {
		return limiter
	}
	
	limiter = rate.NewLimiter(rate.Limit(rl.requestsPerSecond), rl.burstSize)
	rl.clients[clientID] = limiter
	
	return limiter
}

// getClientID determines the client identifier for rate limiting
func (rl *RateLimiter) getClientID(c *gin.Context) string {
	// Try to get user ID first (if authenticated)
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(string); ok {
			return "user:" + id
		}
	}
	
	// Fall back to IP address
	clientIP := c.ClientIP()
	return "ip:" + clientIP
}

// cleanupRoutine periodically removes old client entries
func (rl *RateLimiter) cleanupRoutine() {
	ticker := time.NewTicker(rl.cleanupInterval)
	defer ticker.Stop()
	
	for range ticker.C {
		rl.mutex.Lock()
		
		// In a real implementation, you'd track last access time
		// and remove clients that haven't been seen for a while
		// For simplicity, we're not implementing that here
		
		rl.mutex.Unlock()
	}
}

// UserRateLimiter creates a rate limiter specifically for authenticated users
func UserRateLimiter(requestsPerSecond, burstSize int, logger *zap.Logger) gin.HandlerFunc {
	config := RateLimitConfig{
		RequestsPerSecond: requestsPerSecond,
		BurstSize:         burstSize,
		CleanupInterval:   5 * time.Minute,
		ClientTimeout:     10 * time.Minute,
	}
	
	limiter := NewRateLimiter(config, logger)
	return limiter.Middleware()
}

// IPRateLimiter creates a rate limiter based on IP address
func IPRateLimiter(requestsPerSecond, burstSize int, logger *zap.Logger) gin.HandlerFunc {
	config := RateLimitConfig{
		RequestsPerSecond: requestsPerSecond,
		BurstSize:         burstSize,
		CleanupInterval:   5 * time.Minute,
		ClientTimeout:     10 * time.Minute,
	}
	
	limiter := NewRateLimiter(config, logger)
	return gin.HandlerFunc(func(c *gin.Context) {
		// Force IP-based limiting by removing user context temporarily
		userID := c.GetString("user_id")
		c.Set("user_id", "")
		
		limiter.Middleware()(c)
		
		// Restore user context
		if userID != "" {
			c.Set("user_id", userID)
		}
	})
}

// StrictRateLimiter creates a very restrictive rate limiter
func StrictRateLimiter(logger *zap.Logger) gin.HandlerFunc {
	return UserRateLimiter(5, 10, logger) // 5 requests per second, burst of 10
}

// LenientRateLimiter creates a more permissive rate limiter
func LenientRateLimiter(logger *zap.Logger) gin.HandlerFunc {
	return UserRateLimiter(100, 200, logger) // 100 requests per second, burst of 200
}
