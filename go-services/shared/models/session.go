package models

import (
	"time"
)

// GameSession represents a user's active session
type GameSession struct {
	SessionID   string    `json:"sessionId" redis:"sessionId"`
	UserID      string    `json:"userId" redis:"userId"`
	Status      string    `json:"status" redis:"status"` // "active", "idle", "disconnected"
	
	// Current activity
	CurrentActivity string `json:"currentActivity" redis:"currentActivity"` // "menu", "matchmaking", "in_match", "spectating"
	CurrentMatchID  string `json:"currentMatchId,omitempty" redis:"currentMatchId"`
	
	// Session timing
	ConnectedAt     time.Time  `json:"connectedAt" redis:"connectedAt"`
	LastActivity    time.Time  `json:"lastActivity" redis:"lastActivity"`
	DisconnectedAt  *time.Time `json:"disconnectedAt,omitempty" redis:"disconnectedAt"`
	TotalDuration   int64      `json:"totalDuration" redis:"totalDuration"` // in seconds
	
	// Connection details
	IPAddress       string `json:"ipAddress,omitempty" redis:"ipAddress"`
	UserAgent       string `json:"userAgent,omitempty" redis:"userAgent"`
	Platform        string `json:"platform" redis:"platform"` // "web", "mobile", "desktop"
	
	// Geographic information
	Region          string  `json:"region" redis:"region"`
	Country         string  `json:"country" redis:"country"`
	Timezone        string  `json:"timezone" redis:"timezone"`
	Latitude        float64 `json:"latitude,omitempty" redis:"latitude"`
	Longitude       float64 `json:"longitude,omitempty" redis:"longitude"`
	
	// Performance metrics
	Latency         int     `json:"latency" redis:"latency"` // in ms
	PacketLoss      float64 `json:"packetLoss" redis:"packetLoss"` // percentage
	ConnectionType  string  `json:"connectionType" redis:"connectionType"` // "wifi", "cellular", "ethernet"
	
	// Heartbeat tracking
	LastHeartbeat   time.Time `json:"lastHeartbeat" redis:"lastHeartbeat"`
	HeartbeatCount  int       `json:"heartbeatCount" redis:"heartbeatCount"`
	MissedHeartbeats int      `json:"missedHeartbeats" redis:"missedHeartbeats"`
	
	// Session state
	IsReconnect     bool      `json:"isReconnect" redis:"isReconnect"`
	ReconnectCount  int       `json:"reconnectCount" redis:"reconnectCount"`
	LastDisconnectReason string `json:"lastDisconnectReason,omitempty" redis:"lastDisconnectReason"`
	
	// Metadata
	DeviceInfo      DeviceInfo `json:"deviceInfo" redis:"deviceInfo"`
	SessionFlags    []string   `json:"sessionFlags,omitempty" redis:"sessionFlags"` // "premium", "beta", "admin"
}

// DeviceInfo represents information about the user's device
type DeviceInfo struct {
	DeviceType    string `json:"deviceType"` // "desktop", "tablet", "mobile"
	OS            string `json:"os"`
	OSVersion     string `json:"osVersion"`
	Browser       string `json:"browser"`
	BrowserVersion string `json:"browserVersion"`
	ScreenWidth   int    `json:"screenWidth"`
	ScreenHeight  int    `json:"screenHeight"`
	TouchSupport  bool   `json:"touchSupport"`
}

// UserPresence represents a user's current presence status
type UserPresence struct {
	UserID          string    `json:"userId" realtime:"userId"`
	Status          string    `json:"status" realtime:"status"` // "online", "away", "busy", "offline"
	LastSeen        time.Time `json:"lastSeen" realtime:"lastSeen"`
	CurrentActivity string    `json:"currentActivity" realtime:"currentActivity"`
	Platform        string    `json:"platform,omitempty" realtime:"platform"`
	
	// Match information
	InMatch         bool   `json:"inMatch" realtime:"inMatch"`
	MatchID         string `json:"matchId,omitempty" realtime:"matchId"`
	CurrentMatchID  string `json:"currentMatchId,omitempty" realtime:"currentMatchId"`
	MatchGameMode   string `json:"matchGameMode,omitempty" realtime:"matchGameMode"`
	Location        string `json:"location,omitempty" realtime:"location"`
	
	// Queue information  
	InQueue         bool   `json:"inQueue" realtime:"inQueue"`
	
	// Custom data for extensions
	CustomData      map[string]interface{} `json:"customData,omitempty" realtime:"customData"`
	QueueGameMode   string `json:"queueGameMode,omitempty" realtime:"queueGameMode"`
	QueueRegion     string `json:"queueRegion,omitempty" realtime:"queueRegion"`
	QueueWaitTime   int    `json:"queueWaitTime,omitempty" realtime:"queueWaitTime"`
	
	// Social information
	IsVisible       bool     `json:"isVisible" realtime:"isVisible"`
	CustomMessage   string   `json:"customMessage,omitempty" realtime:"customMessage"`
	FriendsList     []string `json:"friendsList,omitempty" realtime:"friendsList"`
	
	// Connection information
	ConnectionID    string `json:"connectionId,omitempty" realtime:"connectionId"`
	Region          string `json:"region" realtime:"region"`
	
	// Performance
	Latency         int    `json:"latency" realtime:"latency"`
	ConnectionQuality string `json:"connectionQuality" realtime:"connectionQuality"`
	
	// Privacy settings
	ShowActivity    bool `json:"showActivity" realtime:"showActivity"`
	ShowLocation    bool `json:"showLocation" realtime:"showLocation"`
	AllowInvites    bool `json:"allowInvites" realtime:"allowInvites"`
}

// SessionHeartbeat represents a session heartbeat request
type SessionHeartbeat struct {
	SessionID         string    `json:"sessionId" binding:"required"`
	UserID           string    `json:"userId" binding:"required"`
	Timestamp        time.Time `json:"timestamp"`
	CurrentActivity  string    `json:"currentActivity"`
	Latency          int       `json:"latency"`
	PacketLoss       float64   `json:"packetLoss"`
	ConnectionQuality string   `json:"connectionQuality"`
	
	// Optional performance data
	FPS              int     `json:"fps,omitempty"`
	MemoryUsage      int64   `json:"memoryUsage,omitempty"` // in bytes
	BatteryLevel     int     `json:"batteryLevel,omitempty"` // percentage
}

// SessionEvent represents an event that occurred during a session
type SessionEvent struct {
	ID          string                 `json:"id"`
	SessionID   string                 `json:"sessionId"`
	UserID      string                 `json:"userId"`
	EventType   string                 `json:"eventType"`
	EventData   map[string]interface{} `json:"eventData"`
	Timestamp   time.Time              `json:"timestamp"`
	
	// Event context
	MatchID     string `json:"matchId,omitempty"`
	GameMode    string `json:"gameMode,omitempty"`
	Region      string `json:"region,omitempty"`
	
	// Performance context
	Latency     int    `json:"latency,omitempty"`
	FPS         int    `json:"fps,omitempty"`
}

// CreateSessionRequest represents a request to create a new session
type CreateSessionRequest struct {
	UserID         string     `json:"userId" binding:"required"`
	Platform       string     `json:"platform" binding:"required"`
	Region         string     `json:"region"`
	DeviceInfo     DeviceInfo `json:"deviceInfo"`
	IPAddress      string     `json:"ipAddress,omitempty"`
	UserAgent      string     `json:"userAgent,omitempty"`
	IsReconnect    bool       `json:"isReconnect"`
	PreviousSessionID string  `json:"previousSessionId,omitempty"`
}

// UpdatePresenceRequest represents a request to update user presence
type UpdatePresenceRequest struct {
	UserID          string `json:"userId" binding:"required"`
	Status          string `json:"status"`
	CurrentActivity string `json:"currentActivity"`
	CustomMessage   string `json:"customMessage,omitempty"`
	IsVisible       bool   `json:"isVisible"`
	ShowActivity    bool   `json:"showActivity"`
}
