package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	// Server configuration
	Port        string
	Environment string
	ServiceName string

	// Redis configuration
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int
	RedisTLS      bool

	// Firebase configuration
	FirebaseProjectID     string
	FirebaseCredentialsPath string
	FirestoreDatabase     string

	// Database configuration
	UseRedis         bool
	UseFirestore     bool
	UseRealtimeDB    bool

	// Security configuration
	JWTSecret          string
	APIKeySecret       string
	CORSAllowedOrigins []string

	// Performance configuration
	MaxConnections     int
	ConnectionTimeout  int
	ReadTimeout        int
	WriteTimeout       int

	// Monitoring configuration
	MetricsEnabled     bool
	LogLevel          string
	HealthCheckPath   string

	// Geographic configuration
	Region            string
	AvailabilityZone  string

	// Feature flags
	EnableMatchmaking bool
	EnablePresence    bool
	EnableNotifications bool

	// Service addresses for inter-service communication
	PresenceServiceAddr string
	MatchServiceAddr    string
	QueueServiceAddr    string
	APIGatewayAddr      string
	BotServiceAddr      string   // 🤖 Bot AI Service address
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
	// Load .env file if it exists (for local development)
	_ = godotenv.Load()

	config := &Config{
		// Defaults
		Port:        getEnv("PORT", "8080"),
		Environment: getEnv("ENVIRONMENT", "development"),
		ServiceName: getEnv("SERVICE_NAME", "dashdice-service"),

		// Redis defaults
		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvAsInt("REDIS_DB", 0),
		RedisTLS:      getEnvAsBool("REDIS_TLS", false),

		// Firebase defaults
		FirebaseProjectID:       getEnv("FIREBASE_PROJECT_ID", "dashdice-development"),
		FirebaseCredentialsPath: getEnv("FIREBASE_CREDENTIALS_PATH", "./serviceAccount.json"),
		FirestoreDatabase:       getEnv("FIRESTORE_DATABASE", "(default)"),

		// Database usage flags
		UseRedis:      getEnvAsBool("USE_REDIS", true),
		UseFirestore:  getEnvAsBool("USE_FIRESTORE", true),
		UseRealtimeDB: getEnvAsBool("USE_REALTIME_DB", true),

		// Security
		JWTSecret:          getEnv("JWT_SECRET", "your-secret-key-here"),
		APIKeySecret:       getEnv("API_KEY_SECRET", "your-api-key-secret-here"),
		CORSAllowedOrigins: getEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000", "https://dashdice.com"}),

		// Performance
		MaxConnections:    getEnvAsInt("MAX_CONNECTIONS", 1000),
		ConnectionTimeout: getEnvAsInt("CONNECTION_TIMEOUT", 30),
		ReadTimeout:       getEnvAsInt("READ_TIMEOUT", 30),
		WriteTimeout:      getEnvAsInt("WRITE_TIMEOUT", 30),

		// Monitoring
		MetricsEnabled:  getEnvAsBool("METRICS_ENABLED", true),
		LogLevel:        getEnv("LOG_LEVEL", "info"),
		HealthCheckPath: getEnv("HEALTH_CHECK_PATH", "/health"),

		// Geographic
		Region:           getEnv("REGION", "us-central1"),
		AvailabilityZone: getEnv("AVAILABILITY_ZONE", "us-central1-a"),

		// Feature flags
		EnableMatchmaking:   getEnvAsBool("ENABLE_MATCHMAKING", true),
		EnablePresence:      getEnvAsBool("ENABLE_PRESENCE", true),
		EnableNotifications: getEnvAsBool("ENABLE_NOTIFICATIONS", true),

		// Service addresses
		PresenceServiceAddr: getEnv("PRESENCE_SERVICE_ADDR", "presence-service:8080"),
		MatchServiceAddr:    getEnv("MATCH_SERVICE_ADDR", "match-service:8080"),
		QueueServiceAddr:    getEnv("QUEUE_SERVICE_ADDR", "queue-service:8080"),
		APIGatewayAddr:      getEnv("API_GATEWAY_ADDR", "api-gateway:8080"),
		BotServiceAddr:      getEnv("BOT_SERVICE_ADDR", "bot-ai-service:8080"), // 🤖 Bot AI Service
	}

	// Validate required configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("configuration validation failed: %w", err)
	}

	return config, nil
}

// Validate checks if all required configuration is present
func (c *Config) Validate() error {
	if c.FirebaseProjectID == "" {
		return fmt.Errorf("FIREBASE_PROJECT_ID is required")
	}

	if c.UseRedis && c.RedisHost == "" {
		return fmt.Errorf("REDIS_HOST is required when USE_REDIS is true")
	}

	if c.JWTSecret == "your-secret-key-here" && c.Environment == "production" {
		return fmt.Errorf("JWT_SECRET must be set in production")
	}

	return nil
}

// GetRedisAddr returns the complete Redis address
func (c *Config) GetRedisAddr() string {
	return fmt.Sprintf("%s:%s", c.RedisHost, c.RedisPort)
}

// IsProduction returns true if running in production
func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

// IsDevelopment returns true if running in development
func (c *Config) IsDevelopment() bool {
	return c.Environment == "development"
}

// Helper functions for environment variable parsing
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		return strings.Split(value, ",")
	}
	return defaultValue
}
