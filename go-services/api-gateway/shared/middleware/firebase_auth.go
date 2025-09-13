package middleware

import (
	"context"
	"net/http"
	"strings"
	
	"firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	
	"api-gateway/shared/models"
)

// FirebaseAuthMiddleware provides Firebase Authentication middleware
type FirebaseAuthMiddleware struct {
	authClient *auth.Client
	logger     *zap.Logger
}

// NewFirebaseAuthMiddleware creates a new Firebase auth middleware
func NewFirebaseAuthMiddleware(authClient *auth.Client, logger *zap.Logger) *FirebaseAuthMiddleware {
	return &FirebaseAuthMiddleware{
		authClient: authClient,
		logger:     logger,
	}
}

// RequireAuth middleware that requires valid Firebase authentication
func (m *FirebaseAuthMiddleware) RequireAuth() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			m.logger.Debug("Missing Authorization header")
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Missing Authorization header",
				"code":  "MISSING_AUTH",
			})
			c.Abort()
			return
		}

		// Check if the header has the Bearer prefix
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			m.logger.Debug("Invalid Authorization header format", zap.String("header", authHeader))
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid Authorization header format",
				"code":  "INVALID_AUTH_FORMAT",
			})
			c.Abort()
			return
		}

		token := tokenParts[1]
		if token == "" {
			m.logger.Debug("Empty token in Authorization header")
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Empty authentication token",
				"code":  "EMPTY_TOKEN",
			})
			c.Abort()
			return
		}

		// Verify the Firebase ID token
		idToken, err := m.authClient.VerifyIDToken(context.Background(), token)
		if err != nil {
			m.logger.Debug("Failed to verify Firebase ID token", 
				zap.Error(err),
				zap.String("token_prefix", token[:min(len(token), 20)]),
			)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authentication token",
				"code":  "INVALID_TOKEN",
			})
			c.Abort()
			return
		}

		// Create user context from the token
		userCtx := &models.UserContext{
			UID:           idToken.UID,
			Email:         getStringClaim(idToken.Claims, "email"),
			EmailVerified: getBoolClaim(idToken.Claims, "email_verified"),
			Name:          getStringClaim(idToken.Claims, "name"),
			Picture:       getStringClaim(idToken.Claims, "picture"),
			Issuer:        idToken.Issuer,
			Audience:      idToken.Audience,
			ExpiresAt:     idToken.Expires,
			IssuedAt:      idToken.IssuedAt,
			Subject:       idToken.Subject,
			AuthTime:      idToken.AuthTime,
		}

		// Add user context to Gin context
		c.Set("user", userCtx)
		c.Set("user_id", idToken.UID)
		c.Set("firebase_token", idToken)

		m.logger.Debug("Successfully authenticated user",
			zap.String("user_id", idToken.UID),
			zap.String("email", userCtx.Email),
		)

		c.Next()
	})
}

// OptionalAuth middleware that extracts user info if token is provided, but doesn't require it
func (m *FirebaseAuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// No auth provided, continue without user context
			c.Next()
			return
		}

		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			// Invalid format, continue without user context
			c.Next()
			return
		}

		token := tokenParts[1]
		if token == "" {
			c.Next()
			return
		}

		// Try to verify the token, but don't fail if it's invalid
		idToken, err := m.authClient.VerifyIDToken(context.Background(), token)
		if err != nil {
			m.logger.Debug("Optional auth token verification failed", zap.Error(err))
			c.Next()
			return
		}

		// Create user context
		userCtx := &models.UserContext{
			UID:           idToken.UID,
			Email:         getStringClaim(idToken.Claims, "email"),
			EmailVerified: getBoolClaim(idToken.Claims, "email_verified"),
			Name:          getStringClaim(idToken.Claims, "name"),
			Picture:       getStringClaim(idToken.Claims, "picture"),
			Issuer:        idToken.Issuer,
			Audience:      idToken.Audience,
			ExpiresAt:     idToken.Expires,
			IssuedAt:      idToken.IssuedAt,
			Subject:       idToken.Subject,
			AuthTime:      idToken.AuthTime,
		}

		c.Set("user", userCtx)
		c.Set("user_id", idToken.UID)
		c.Set("firebase_token", idToken)

		c.Next()
	})
}

// AdminOnly middleware that requires the user to have admin privileges
func (m *FirebaseAuthMiddleware) AdminOnly() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
				"code":  "AUTH_REQUIRED",
			})
			c.Abort()
			return
		}

		userCtx, ok := user.(*models.UserContext)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Invalid user context",
				"code":  "INVALID_USER_CONTEXT",
			})
			c.Abort()
			return
		}

		// Check if user has admin role (you can customize this logic)
		if !m.isAdmin(userCtx) {
			m.logger.Warn("User attempted to access admin endpoint",
				zap.String("user_id", userCtx.UID),
				zap.String("email", userCtx.Email),
			)
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Admin privileges required",
				"code":  "ADMIN_REQUIRED",
			})
			c.Abort()
			return
		}

		c.Next()
	})
}

// isAdmin checks if a user has admin privileges
func (m *FirebaseAuthMiddleware) isAdmin(user *models.UserContext) bool {
	// TODO: Implement admin check logic
	// This could check against a database, Firebase custom claims, etc.
	
	// For now, check if it's a specific admin email
	adminEmails := []string{
		"david.lukeatkins@gmail.com", // Add your admin email here
		"admin@dashdice.com",
	}
	
	for _, adminEmail := range adminEmails {
		if user.Email == adminEmail {
			return true
		}
	}
	
	return false
}
