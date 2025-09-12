package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"time"
	
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// LoggingMiddleware provides structured logging for HTTP requests
func LoggingMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		// Use structured logging instead of formatted string
		fields := []zap.Field{
			zap.String("method", param.Method),
			zap.String("path", param.Path),
			zap.Int("status", param.StatusCode),
			zap.Duration("latency", param.Latency),
			zap.String("client_ip", param.ClientIP),
			zap.String("user_agent", param.Request.UserAgent()),
		}
		
		// Add error if present
		if param.ErrorMessage != "" {
			fields = append(fields, zap.String("error", param.ErrorMessage))
		}
		
		// Log at appropriate level based on status code
		if param.StatusCode >= 500 {
			logger.Error("HTTP request", fields...)
		} else if param.StatusCode >= 400 {
			logger.Warn("HTTP request", fields...)
		} else {
			logger.Info("HTTP request", fields...)
		}
		
		return "" // Return empty string since we're using structured logging
	})
}

// DetailedLoggingMiddleware provides more detailed request/response logging
func DetailedLoggingMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		start := time.Now()
		
		// Capture request body for logging (be careful with large bodies)
		var requestBody []byte
		if c.Request.Body != nil && c.Request.ContentLength < 10000 { // Only log small bodies
			requestBody, _ = c.GetRawData()
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}
		
		// Create a response writer wrapper to capture response
		writer := &responseWriter{
			ResponseWriter: c.Writer,
			body:          bytes.NewBuffer([]byte{}),
		}
		c.Writer = writer
		
		// Get user info if available
		userID := ""
		if uid, exists := c.Get("user_id"); exists {
			if id, ok := uid.(string); ok {
				userID = id
			}
		}
		
		// Process request
		c.Next()
		
		// Calculate duration
		duration := time.Since(start)
		
		// Build log fields
		fields := []zap.Field{
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.String("query", c.Request.URL.RawQuery),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("latency", duration),
			zap.String("client_ip", c.ClientIP()),
			zap.String("user_agent", c.Request.UserAgent()),
			zap.String("user_id", userID),
			zap.Int64("request_size", c.Request.ContentLength),
			zap.Int("response_size", writer.body.Len()),
		}
		
		// Add request body if it's JSON and not too large
		if len(requestBody) > 0 && len(requestBody) < 1000 {
			if json.Valid(requestBody) {
				fields = append(fields, zap.String("request_body", string(requestBody)))
			}
		}
		
		// Add response body if it's JSON and not too large
		if writer.body.Len() < 1000 {
			responseBody := writer.body.Bytes()
			if json.Valid(responseBody) {
				fields = append(fields, zap.String("response_body", string(responseBody)))
			}
		}
		
		// Add error information from context
		if errors := c.Errors; len(errors) > 0 {
			errorMessages := make([]string, len(errors))
			for i, err := range errors {
				errorMessages[i] = err.Error()
			}
			fields = append(fields, zap.Strings("errors", errorMessages))
		}
		
		// Log at appropriate level
		if c.Writer.Status() >= 500 {
			logger.Error("HTTP request completed", fields...)
		} else if c.Writer.Status() >= 400 {
			logger.Warn("HTTP request completed", fields...)
		} else {
			logger.Info("HTTP request completed", fields...)
		}
	})
}

// responseWriter wraps gin.ResponseWriter to capture response body
type responseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *responseWriter) Write(data []byte) (int, error) {
	w.body.Write(data)
	return w.ResponseWriter.Write(data)
}

// RequestIDMiddleware adds a unique request ID to each request
func RequestIDMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Check if request ID already exists (e.g., from load balancer)
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			// Generate a simple request ID (in production, use a proper UUID library)
			requestID = generateRequestID()
		}
		
		// Set request ID in context and response header
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		
		c.Next()
	})
}

// Simple request ID generator (use a proper UUID library in production)
func generateRequestID() string {
	return "req_" + string(rune(time.Now().UnixNano()))
}

// GetRequestID extracts the request ID from the Gin context
func GetRequestID(c *gin.Context) string {
	if requestID, exists := c.Get("request_id"); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	return ""
}

// SecurityHeadersMiddleware adds common security headers
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Add security headers
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		
		// Only add HSTS in production with HTTPS
		if c.Request.TLS != nil {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		
		c.Next()
	})
}

// CORSMiddleware handles Cross-Origin Resource Sharing
func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if allowedOrigin == "*" || allowedOrigin == origin {
				allowed = true
				break
			}
		}
		
		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-Requested-With")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400") // 24 hours
		
		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		
		c.Next()
	})
}

// RecoveryMiddleware provides panic recovery with structured logging
func RecoveryMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return gin.RecoveryWithWriter(gin.DefaultErrorWriter, func(c *gin.Context, recovered interface{}) {
		// Log the panic with context
		logger.Error("Panic recovered",
			zap.Any("panic", recovered),
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.String("client_ip", c.ClientIP()),
			zap.String("user_agent", c.Request.UserAgent()),
			zap.String("request_id", GetRequestID(c)))
		
		// Return error response
		c.JSON(500, gin.H{
			"error":      "Internal server error",
			"code":       "INTERNAL_ERROR",
			"request_id": GetRequestID(c),
		})
	})
}
