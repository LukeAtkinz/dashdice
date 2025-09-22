package models

import (
	"time"
)

// QueuePlayer represents a player waiting in matchmaking queue
type QueuePlayer struct {
	UserID       string    `json:"userId" redis:"userId"`
	DisplayName  string    `json:"displayName" redis:"displayName"`
	PhotoURL     string    `json:"photoURL" redis:"photoURL"`
	
	// Queue metadata
	GameMode     string    `json:"gameMode" redis:"gameMode"`
	GameType     string    `json:"gameType" redis:"gameType"` // "quick", "ranked"
	Region       string    `json:"region" redis:"region"`
	JoinedAt     time.Time `json:"joinedAt" redis:"joinedAt"`
	
	// Player attributes for matching
	ELO                int    `json:"elo" redis:"elo"`
	ConnectionQuality  string `json:"connectionQuality" redis:"connectionQuality"` // "poor", "good", "excellent"
	
	// Matchmaking preferences
	Preferences        MatchmakingPreferences `json:"preferences" redis:"preferences"`
	
	// Queue position and timing
	QueuePosition      int       `json:"queuePosition" redis:"queuePosition"`
	EstimatedWaitTime  int       `json:"estimatedWaitTime" redis:"estimatedWaitTime"` // in seconds
	LastHeartbeat      time.Time `json:"lastHeartbeat" redis:"lastHeartbeat"`
	
	// Connection information
	IPAddress         string `json:"ipAddress,omitempty" redis:"ipAddress"`
	UserAgent         string `json:"userAgent,omitempty" redis:"userAgent"`
	
	// Group matchmaking (for friends)
	GroupID           string   `json:"groupId,omitempty" redis:"groupId"`
	GroupMembers      []string `json:"groupMembers,omitempty" redis:"groupMembers"`
	IsGroupLeader     bool     `json:"isGroupLeader" redis:"isGroupLeader"`
	
	// Priority and special flags
	Priority          int    `json:"priority" redis:"priority"` // Higher number = higher priority
	IsPremium         bool   `json:"isPremium" redis:"isPremium"`
	AllowBots         bool   `json:"allowBots" redis:"allowBots"`
	IsBot             bool   `json:"isBot" redis:"isBot"` // 🤖 Indicates if this is a bot player
	
	// Retry tracking
	RetryCount        int      `json:"retryCount" redis:"retryCount"`
	LastFailedMatch   string   `json:"lastFailedMatch,omitempty" redis:"lastFailedMatch"`
}

// QueueStatus represents the current state of matchmaking queues
type QueueStatus struct {
	GameMode          string    `json:"gameMode"`
	Region           string    `json:"region"`
	TotalPlayers     int       `json:"totalPlayers"`
	AverageWaitTime  int       `json:"averageWaitTime"` // in seconds
	EstimatedWaitTime int      `json:"estimatedWaitTime"`
	QueueHealth      string    `json:"queueHealth"` // "healthy", "slow", "critical"
	LastUpdate       time.Time `json:"lastUpdate"`
	
	// Queue segments
	QuickPlayQueue   int `json:"quickPlayQueue"`
	RankedQueue      int `json:"rankedQueue"`
	PremiumQueue     int `json:"premiumQueue"`
	
	// Performance metrics
	MatchesPerMinute    float64 `json:"matchesPerMinute"`
	AverageMatchQuality float64 `json:"averageMatchQuality"` // 0-1 score
	
	// Regional distribution
	RegionalQueues map[string]int `json:"regionalQueues"`
}

// JoinQueueRequest represents a request to join matchmaking queue
type JoinQueueRequest struct {
	UserID      string                 `json:"userId" binding:"required"`
	GameMode    string                 `json:"gameMode" binding:"required"`
	GameType    string                 `json:"gameType" binding:"required"`
	Region      string                 `json:"region"`
	Preferences MatchmakingPreferences `json:"preferences"`
	
	// Group matchmaking
	GroupID     string   `json:"groupId,omitempty"`
	GroupMembers []string `json:"groupMembers,omitempty"`
	
	// Connection info
	ConnectionQuality string `json:"connectionQuality"`
	IPAddress        string `json:"ipAddress,omitempty"`
	UserAgent        string `json:"userAgent,omitempty"`
}

// LeaveQueueRequest represents a request to leave matchmaking queue
type LeaveQueueRequest struct {
	UserID   string `json:"userId" binding:"required"`
	GameMode string `json:"gameMode"`
	Region   string `json:"region"`
}

// QueueHeartbeatRequest represents a heartbeat from a queued player
type QueueHeartbeatRequest struct {
	UserID             string `json:"userId" binding:"required"`
	QueuePosition      int    `json:"queuePosition"`
	ConnectionQuality  string `json:"connectionQuality"`
	StillWaiting       bool   `json:"stillWaiting"`
}

// MatchFoundNotification represents a match found notification
type MatchFoundNotification struct {
	MatchID      string          `json:"matchId"`
	Players      []QueuePlayer   `json:"players"`
	GameMode     string          `json:"gameMode"`
	GameType     string          `json:"gameType"`
	Region       string          `json:"region"`
	EstimatedPing int            `json:"estimatedPing"`
	MatchQuality float64        `json:"matchQuality"` // 0-1 score based on ELO balance
	
	// Time limits
	AcceptDeadline time.Time `json:"acceptDeadline"`
	WaitTime       int       `json:"waitTime"` // How long they waited in seconds
}

// MatchAcceptRequest represents accepting a found match
type MatchAcceptRequest struct {
	UserID  string `json:"userId" binding:"required"`
	MatchID string `json:"matchId" binding:"required"`
	Accept  bool   `json:"accept"`
}

// QueueMetrics represents queue performance metrics
type QueueMetrics struct {
	Timestamp           time.Time `json:"timestamp"`
	GameMode           string    `json:"gameMode"`
	Region             string    `json:"region"`
	
	// Queue size metrics
	TotalPlayersQueued     int     `json:"totalPlayersQueued"`
	QuickPlayQueued        int     `json:"quickPlayQueued"`
	RankedQueued           int     `json:"rankedQueued"`
	PremiumQueued          int     `json:"premiumQueued"`
	
	// Performance metrics
	AverageWaitTime        float64 `json:"averageWaitTime"`
	MedianWaitTime         float64 `json:"medianWaitTime"`
	MaxWaitTime            float64 `json:"maxWaitTime"`
	MatchesCreatedLastHour int     `json:"matchesCreatedLastHour"`
	MatchSuccessRate       float64 `json:"matchSuccessRate"`
	
	// Quality metrics
	AverageELODifference   float64 `json:"averageELODifference"`
	PerfectMatches         int     `json:"perfectMatches"` // Matches with <50 ELO difference
	AcceptableMatches      int     `json:"acceptableMatches"` // Matches with <200 ELO difference
	
	// System health
	SystemLatency          float64 `json:"systemLatency"`
	ErrorRate             float64 `json:"errorRate"`
	TimeoutRate           float64 `json:"timeoutRate"`
}
