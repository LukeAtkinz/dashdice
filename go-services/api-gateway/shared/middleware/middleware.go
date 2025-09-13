package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
	"golang.org/x/time/rate"

	"api-gateway/shared/config"
)

// Logger middleware for structured logging
func Logger(logger *zap.Logger) gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		logger.Info("HTTP Request",
			zap.String("method", param.Method),
			zap.String("path", param.Path),
			zap.Int("status", param.StatusCode),
			zap.Duration("latency", param.Latency),
			zap.String("ip", param.ClientIP),
			zap.String("user_agent", param.Request.UserAgent()),
			zap.String("error", param.ErrorMessage),
		)
		return ""
	})
}

// CORS middleware for cross-origin requests
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// Auth middleware for JWT authentication
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>" format
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		// Parse and validate JWT token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Validate signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			// Return the secret key - in production this should come from config
			return []byte("your-secret-key"), nil // TODO: Get from config
		})

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			// Extract user information from claims
			userID, ok := claims["user_id"].(string)
			if !ok {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
				c.Abort()
				return
			}

			// Set user context
			c.Set("user_id", userID)
			c.Set("claims", claims)
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// AdminAuth middleware for admin authentication
func AdminAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// First check regular auth
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte("your-secret-key"), nil // TODO: Get from config
		})

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			userID, ok := claims["user_id"].(string)
			if !ok {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
				c.Abort()
				return
			}

			// Check admin role
			role, ok := claims["role"].(string)
			if !ok || role != "admin" {
				c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
				c.Abort()
				return
			}

			c.Set("user_id", userID)
			c.Set("claims", claims)
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// In-memory rate limiter storage (in production, use Redis)
var rateLimiters = make(map[string]*rate.Limiter)

// RateLimit middleware for request rate limiting
func RateLimit() gin.HandlerFunc {
	// Default configuration
	config := RateLimitConfig{
		RequestsPerSecond: 1,      // 1 request per second = 60 per minute
		BurstSize:         100,
		CleanupInterval:   5 * time.Minute,
		ClientTimeout:     10 * time.Minute,
	}
	
	rateLimiter := NewRateLimiter(config, nil) // nil logger for now

	return rateLimiter.Middleware()
}

// RequestID middleware adds a unique request ID to each request
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := fmt.Sprintf("req_%d", time.Now().UnixNano())
		c.Header("X-Request-ID", requestID)
		c.Set("request_id", requestID)
		c.Next()
	}
}

// Security middleware for security headers
func Security() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Content-Security-Policy", "default-src 'self'")
		c.Next()
	}
}

// Timeout middleware for request timeouts
func Timeout(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		defer cancel()

		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

// Recovery middleware for panic recovery
func Recovery(logger *zap.Logger) gin.HandlerFunc {
	return gin.RecoveryWithWriter(gin.DefaultErrorWriter, func(c *gin.Context, recovered interface{}) {
		if err, ok := recovered.(string); ok {
			logger.Error("Panic recovered",
				zap.String("error", err),
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method),
				zap.String("ip", c.ClientIP()),
			)
		}
		c.AbortWithStatus(http.StatusInternalServerError)
	})
}

// ValidationError represents a validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// Validate middleware for request validation
func Validate() gin.HandlerFunc {
	return func(c *gin.Context) {
		// This is a placeholder for request validation
		// In a real implementation, you would validate request bodies
		// based on the endpoint and expected structure
		c.Next()
	}
}

// ServiceAuth middleware for service-to-service authentication
func ServiceAuth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.GetHeader("X-API-Key")
		if apiKey == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "API key required"})
			c.Abort()
			return
		}

		// Validate API key
		if apiKey != cfg.APIKeySecret {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid API key"})
			c.Abort()
			return
		}

		c.Set("service_auth", true)
		c.Next()
	}
}

// Metrics middleware for collecting request metrics
func Metrics() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		
		c.Next()
		
		// Calculate request duration
		duration := time.Since(start)
		
		// Log metrics (in production, send to monitoring system)
		path := c.Request.URL.Path
		method := c.Request.Method
		status := c.Writer.Status()
		
		// Set response headers for metrics
		c.Header("X-Response-Time", duration.String())
		
		// In a real implementation, you would send these metrics to
		// Prometheus, DataDog, or another monitoring system
		_ = path
		_ = method
		_ = status
		_ = duration
	}
}

// UserContext middleware extracts user information and adds to context
func UserContext(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.Next()
			return
		}

		// In a real implementation, you might fetch additional user data
		// from the database and add it to the context
		logger.Debug("User context set", zap.String("user_id", userID.(string)))
		
		c.Next()
	}
}

// ContentType middleware ensures proper content type for API endpoints
func ContentType() gin.HandlerFunc {
	return func(c *gin.Context) {
		// For POST, PUT, PATCH requests, ensure JSON content type
		method := c.Request.Method
		if method == "POST" || method == "PUT" || method == "PATCH" {
			contentType := c.GetHeader("Content-Type")
			if !strings.Contains(contentType, "application/json") {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Content-Type must be application/json",
				})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

// APIVersion middleware handles API versioning
func APIVersion(supportedVersions []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		version := c.GetHeader("API-Version")
		if version == "" {
			// Default to latest version
			version = "v1"
		}

		// Check if version is supported
		supported := false
		for _, v := range supportedVersions {
			if v == version {
				supported = true
				break
			}
		}

		if !supported {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             "Unsupported API version",
				"requested_version": version,
				"supported_versions": supportedVersions,
			})
			c.Abort()
			return
		}

		c.Set("api_version", version)
		c.Header("API-Version", version)
		c.Next()
	}
}

// Maintenance middleware for maintenance mode
func Maintenance(enabled bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if enabled {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error":   "Service temporarily unavailable",
				"message": "The service is currently under maintenance. Please try again later.",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// Helper functions

// GetUserID extracts user ID from context
func GetUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return "", false
	}
	if id, ok := userID.(string); ok {
		return id, true
	}
	return "", false
}

// IsServiceAuth checks if the request is from a service
func IsServiceAuth(c *gin.Context) bool {
	if serviceAuth, exists := c.Get("service_auth"); exists {
		if auth, ok := serviceAuth.(bool); ok {
			return auth
		}
	}
	return false
}

// GetClaims extracts JWT claims from context
func GetClaims(c *gin.Context) (jwt.MapClaims, bool) {
	claims, exists := c.Get("claims")
	if !exists {
		return nil, false
	}
	if jwtClaims, ok := claims.(jwt.MapClaims); ok {
		return jwtClaims, true
	}
	return nil, false
}

// AuthRequired is a helper function to check if user is authenticated
func AuthRequired(c *gin.Context) bool {
	_, exists := c.Get("user_id")
	return exists
}

// ServiceAuthOrUserAuth middleware allows either service auth or user auth
func ServiceAuthOrUserAuth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try service auth first
		apiKey := c.GetHeader("X-API-Key")
		if apiKey != "" && apiKey == cfg.APIKeySecret {
			c.Set("service_auth", true)
			c.Next()
			return
		}

		// Try user auth
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization required"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte("your-secret-key"), nil // TODO: Get from config
		})

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			userID, ok := claims["user_id"].(string)
			if !ok {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
				c.Abort()
				return
			}

			c.Set("user_id", userID)
			c.Set("claims", claims)
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Next()
	}
}
