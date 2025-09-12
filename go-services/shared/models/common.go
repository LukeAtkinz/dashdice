package models

import (
	"time"
)

// WebSocketMessage represents a real-time message sent over WebSocket
type WebSocketMessage struct {
	Type      string                 `json:"type"`
	MessageID string                 `json:"messageId,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
	
	// Routing information
	MatchID   string   `json:"matchId,omitempty"`
	UserID    string   `json:"userId,omitempty"`
	Recipients []string `json:"recipients,omitempty"` // For targeted messages
	
	// Message metadata
	Priority  string `json:"priority,omitempty"` // "low", "normal", "high", "critical"
	Reliable  bool   `json:"reliable,omitempty"` // Requires acknowledgment
	TTL       int    `json:"ttl,omitempty"`      // Time to live in seconds
}

// WebSocketConnection represents an active WebSocket connection
type WebSocketConnection struct {
	ConnectionID   string    `json:"connectionId"`
	UserID        string    `json:"userId"`
	SessionID     string    `json:"sessionId"`
	ConnectedAt   time.Time `json:"connectedAt"`
	LastPing      time.Time `json:"lastPing"`
	
	// Connection details
	IPAddress     string `json:"ipAddress"`
	UserAgent     string `json:"userAgent"`
	
	// Subscriptions
	Subscriptions []string `json:"subscriptions"` // Match IDs, channels, etc.
	
	// Performance metrics
	MessagesSent     int64   `json:"messagesSent"`
	MessagesReceived int64   `json:"messagesReceived"`
	AverageLatency   float64 `json:"averageLatency"`
	
	// Connection health
	IsHealthy        bool      `json:"isHealthy"`
	LastError        string    `json:"lastError,omitempty"`
	ReconnectCount   int       `json:"reconnectCount"`
	LastReconnect    time.Time `json:"lastReconnect,omitempty"`
}

// Notification represents a push notification
type Notification struct {
	ID           string                 `json:"id"`
	UserID       string                 `json:"userId"`
	Type         string                 `json:"type"`
	Title        string                 `json:"title"`
	Body         string                 `json:"body"`
	Data         map[string]interface{} `json:"data,omitempty"`
	
	// Delivery settings
	Priority     string    `json:"priority"` // "low", "normal", "high"
	Sound        string    `json:"sound,omitempty"`
	Badge        int       `json:"badge,omitempty"`
	Icon         string    `json:"icon,omitempty"`
	
	// Scheduling
	ScheduledFor *time.Time `json:"scheduledFor,omitempty"`
	ExpiresAt    *time.Time `json:"expiresAt,omitempty"`
	
	// Tracking
	CreatedAt    time.Time  `json:"createdAt"`
	SentAt       *time.Time `json:"sentAt,omitempty"`
	DeliveredAt  *time.Time `json:"deliveredAt,omitempty"`
	OpenedAt     *time.Time `json:"openedAt,omitempty"`
	
	// Status
	Status       string `json:"status"` // "pending", "sent", "delivered", "opened", "failed"
	Error        string `json:"error,omitempty"`
	
	// Targeting
	Platform     []string `json:"platform,omitempty"` // "web", "mobile", "desktop"
	Region       []string `json:"region,omitempty"`
	Language     string   `json:"language,omitempty"`
	
	// Campaign information
	CampaignID   string `json:"campaignId,omitempty"`
	Category     string `json:"category,omitempty"`
	
	// User preferences
	Personalized bool                   `json:"personalized"`
	Template     string                 `json:"template,omitempty"`
	Variables    map[string]interface{} `json:"variables,omitempty"`
}

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Code      string                 `json:"code"`
	Message   string                 `json:"message"`
	Details   string                 `json:"details,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
	RequestID string                 `json:"requestId,omitempty"`
	Data      map[string]interface{} `json:"data,omitempty"`
	
	// Error context
	Service   string `json:"service,omitempty"`
	Endpoint  string `json:"endpoint,omitempty"`
	UserID    string `json:"userId,omitempty"`
	
	// Debugging information (only in development)
	StackTrace string `json:"stackTrace,omitempty"`
	DebugInfo  map[string]interface{} `json:"debugInfo,omitempty"`
}

// APIResponse represents a standardized API response
type APIResponse struct {
	Success   bool                   `json:"success"`
	Data      interface{}            `json:"data,omitempty"`
	Error     *ErrorResponse         `json:"error,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
	RequestID string                 `json:"requestId"`
	
	// Pagination (when applicable)
	Pagination *PaginationInfo `json:"pagination,omitempty"`
	
	// Performance metrics
	ProcessingTime float64 `json:"processingTime,omitempty"` // in milliseconds
	CacheHit       bool    `json:"cacheHit,omitempty"`
}

// PaginationInfo represents pagination information
type PaginationInfo struct {
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
	HasNext    bool `json:"hasNext"`
	HasPrev    bool `json:"hasPrev"`
}

// HealthCheck represents a health check response
type HealthCheck struct {
	Status      string                 `json:"status"` // "healthy", "degraded", "unhealthy"
	Timestamp   time.Time              `json:"timestamp"`
	Version     string                 `json:"version"`
	Uptime      int64                  `json:"uptime"` // in seconds
	Checks      map[string]interface{} `json:"checks"`
	
	// Service information
	ServiceName string `json:"serviceName"`
	Region      string `json:"region"`
	InstanceID  string `json:"instanceId"`
	
	// Performance metrics
	ResponseTime    float64 `json:"responseTime"`
	MemoryUsage     int64   `json:"memoryUsage"`
	CPUUsage        float64 `json:"cpuUsage"`
	ActiveConnections int   `json:"activeConnections"`
	
	// Dependencies health
	Dependencies map[string]string `json:"dependencies"` // service -> status
}

// MetricsData represents metrics data for monitoring
type MetricsData struct {
	MetricName  string                 `json:"metricName"`
	Value       float64                `json:"value"`
	Unit        string                 `json:"unit"`
	Timestamp   time.Time              `json:"timestamp"`
	Labels      map[string]string      `json:"labels,omitempty"`
	Dimensions  map[string]interface{} `json:"dimensions,omitempty"`
	
	// Aggregation info
	AggregationType string  `json:"aggregationType,omitempty"` // "sum", "avg", "min", "max", "count"
	SampleCount     int     `json:"sampleCount,omitempty"`
	
	// Alert thresholds
	WarningThreshold  float64 `json:"warningThreshold,omitempty"`
	CriticalThreshold float64 `json:"criticalThreshold,omitempty"`
}

// AuditLog represents an audit log entry
type AuditLog struct {
	ID          string                 `json:"id"`
	Timestamp   time.Time              `json:"timestamp"`
	UserID      string                 `json:"userId,omitempty"`
	SessionID   string                 `json:"sessionId,omitempty"`
	Action      string                 `json:"action"`
	Resource    string                 `json:"resource"`
	ResourceID  string                 `json:"resourceId,omitempty"`
	
	// Event details
	Details     map[string]interface{} `json:"details,omitempty"`
	OldValues   map[string]interface{} `json:"oldValues,omitempty"`
	NewValues   map[string]interface{} `json:"newValues,omitempty"`
	
	// Request context
	IPAddress   string `json:"ipAddress,omitempty"`
	UserAgent   string `json:"userAgent,omitempty"`
	RequestID   string `json:"requestId,omitempty"`
	Endpoint    string `json:"endpoint,omitempty"`
	Method      string `json:"method,omitempty"`
	
	// Result
	Success     bool   `json:"success"`
	Error       string `json:"error,omitempty"`
	StatusCode  int    `json:"statusCode,omitempty"`
	
	// Security context
	RiskLevel   string `json:"riskLevel,omitempty"` // "low", "medium", "high", "critical"
	Flagged     bool   `json:"flagged,omitempty"`
	Tags        []string `json:"tags,omitempty"`
}
