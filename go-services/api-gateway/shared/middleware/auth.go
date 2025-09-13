package middleware

import (
	"context"
	"net/http"
	"strings"
	
	"firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	
	"api-gateway/shared/config"
	"api-gateway/shared/models"
)

// AuthMiddleware provides Firebase authentication middleware
type AuthMiddleware struct {
	authClient *auth.Client
	logger     *zap.Logger
	config     *config.Config
}

// NewAuthMiddleware creates a new authentication middleware instance
func NewAuthMiddleware(authClient *auth.Client, logger *zap.Logger, config *config.Config) *AuthMiddleware {
	return &AuthMiddleware{
		authClient: authClient,
		logger:     logger,
		config:     config,
	}
}

// RequireAuth middleware that requires valid Firebase authentication
func (am *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Get authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header required",
				"code":  "AUTH_HEADER_MISSING",
			})
			c.Abort()
			return
		}
		
		// Check for Bearer token format
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization format. Use 'Bearer <token>'",
				"code":  "AUTH_FORMAT_INVALID",
			})
			c.Abort()
			return
		}
		
		idToken := tokenParts[1]
		
		// Verify the Firebase ID token
		token, err := am.authClient.VerifyIDToken(context.Background(), idToken)
		if err != nil {
			am.logger.Warn("Invalid Firebase token", 
				zap.Error(err),
				zap.String("token_preview", idToken[:min(20, len(idToken))]))
			
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
				"code":  "TOKEN_INVALID",
			})
			c.Abort()
			return
		}
		
		// Create user context from token claims
		user := &models.User{
			UID:         token.UID,
			Email:       getStringClaim(token.Claims, "email"),
			DisplayName: getStringClaim(token.Claims, "name"),
			IsActive:    true, // User is active if authenticated
		}
		
		// Set user in context
		c.Set("user", user)
		c.Set("user_id", token.UID)
		c.Set("firebase_token", token)
		
		am.logger.Debug("User authenticated",
			zap.String("user_id", token.UID),
			zap.String("email", user.Email))
		
		c.Next()
	})
}

// OptionalAuth middleware that extracts user if token is present but doesn't require it
func (am *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}
		
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.Next()
			return
		}
		
		idToken := tokenParts[1]
		
		// Try to verify the token, but don't fail if it's invalid
		token, err := am.authClient.VerifyIDToken(context.Background(), idToken)
		if err != nil {
			am.logger.Debug("Optional auth failed", zap.Error(err))
			c.Next()
			return
		}
		
		// Set user in context if token is valid
		user := &models.User{
			UID:         token.UID,
			Email:       getStringClaim(token.Claims, "email"),
			DisplayName: getStringClaim(token.Claims, "name"),
			IsActive:    true, // User is active if authenticated
		}
		
		c.Set("user", user)
		c.Set("user_id", token.UID)
		c.Set("firebase_token", token)
		
		c.Next()
	})
}

// RequireRole middleware that requires specific user role
func (am *AuthMiddleware) RequireRole(requiredRole string) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// This should be called after RequireAuth
		token, exists := c.Get("firebase_token")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
				"code":  "AUTH_REQUIRED",
			})
			c.Abort()
			return
		}
		
		firebaseToken := token.(*auth.Token)
		userRole := getStringClaim(firebaseToken.Claims, "role")
		
		if userRole != requiredRole {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions",
				"code":  "INSUFFICIENT_PERMISSIONS",
				"required_role": requiredRole,
				"user_role": userRole,
			})
			c.Abort()
			return
		}
		
		c.Next()
	})
}

// AdminOnly middleware that requires admin role
func (am *AuthMiddleware) AdminOnly() gin.HandlerFunc {
	return am.RequireRole("admin")
}

// Helper functions for extracting claims
func getStringClaim(claims map[string]interface{}, key string) string {
	if val, ok := claims[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

func getBoolClaim(claims map[string]interface{}, key string) bool {
	if val, ok := claims[key]; ok {
		if b, ok := val.(bool); ok {
			return b
		}
	}
	return false
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// GetCurrentUser extracts the current user from the Gin context
func GetCurrentUser(c *gin.Context) (*models.User, error) {
	user, exists := c.Get("user")
	if !exists {
		return nil, http.ErrNoCookie // Using this as a "not found" error
	}
	
	if u, ok := user.(*models.User); ok {
		return u, nil
	}
	
	return nil, http.ErrNoCookie
}

// GetCurrentUserID extracts the current user ID from the Gin context
func GetCurrentUserID(c *gin.Context) (string, error) {
	userID, exists := c.Get("user_id")
	if !exists {
		return "", http.ErrNoCookie
	}
	
	if id, ok := userID.(string); ok {
		return id, nil
	}
	
	return "", http.ErrNoCookie
}
