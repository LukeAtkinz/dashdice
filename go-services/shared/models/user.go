package models

import (
	"time"
)

// UserContext represents the authenticated user context from Firebase
type UserContext struct {
	UID           string                 `json:"uid"`
	Email         string                 `json:"email"`
	EmailVerified bool                   `json:"email_verified"`
	Name          string                 `json:"name"`
	Picture       string                 `json:"picture"`
	Issuer        string                 `json:"issuer"`
	Audience      string                 `json:"audience"`
	ExpiresAt     int64                  `json:"expires_at"`
	IssuedAt      int64                  `json:"issued_at"`
	Subject       string                 `json:"subject"`
	AuthTime      int64                  `json:"auth_time"`
	CustomClaims  map[string]interface{} `json:"custom_claims,omitempty"`
}

// User represents a DashDice user
type User struct {
	UID         string    `json:"uid" firestore:"uid"`
	Email       string    `json:"email" firestore:"email"`
	DisplayName string    `json:"displayName" firestore:"displayName"`
	PhotoURL    string    `json:"photoURL" firestore:"photoURL"`
	CreatedAt   time.Time `json:"createdAt" firestore:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt" firestore:"updatedAt"`
	LastSeen    time.Time `json:"lastSeen" firestore:"lastSeen"`
	
	// Game statistics
	Stats       PlayerStats `json:"stats" firestore:"stats"`
	
	// User preferences
	Preferences UserPreferences `json:"preferences" firestore:"preferences"`
	
	// Account status
	IsActive    bool   `json:"isActive" firestore:"isActive"`
	IsBanned    bool   `json:"isBanned" firestore:"isBanned"`
	BanReason   string `json:"banReason,omitempty" firestore:"banReason,omitempty"`
}

// PlayerStats represents player game statistics
type PlayerStats struct {
	TotalMatches     int                    `json:"totalMatches" firestore:"totalMatches"`
	Wins            int                    `json:"wins" firestore:"wins"`
	Losses          int                    `json:"losses" firestore:"losses"`
	WinRate         float64               `json:"winRate" firestore:"winRate"`
	TotalScore      int64                 `json:"totalScore" firestore:"totalScore"`
	HighestScore    int                   `json:"highestScore" firestore:"highestScore"`
	AverageScore    float64               `json:"averageScore" firestore:"averageScore"`
	PlayTime        int64                 `json:"playTime" firestore:"playTime"` // in seconds
	CurrentStreak   int                   `json:"currentStreak" firestore:"currentStreak"`
	BestStreak      int                   `json:"bestStreak" firestore:"bestStreak"`
	
	// Game mode specific stats
	GameModeStats   map[string]GameModeStats `json:"gameModeStats" firestore:"gameModeStats"`
	
	// ELO ratings for ranked play
	EloRatings      map[string]int         `json:"eloRatings" firestore:"eloRatings"`
	
	// Achievement tracking
	Achievements    []string               `json:"achievements" firestore:"achievements"`
	LastAchievement time.Time             `json:"lastAchievement" firestore:"lastAchievement"`
}

// GameModeStats represents statistics for a specific game mode
type GameModeStats struct {
	Matches       int     `json:"matches"`
	Wins         int     `json:"wins"`
	Losses       int     `json:"losses"`
	WinRate      float64 `json:"winRate"`
	BestScore    int     `json:"bestScore"`
	AverageScore float64 `json:"averageScore"`
	PlayTime     int64   `json:"playTime"`
}

// UserPreferences represents user configuration preferences
type UserPreferences struct {
	PreferredGameModes    []string          `json:"preferredGameModes" firestore:"preferredGameModes"`
	NotificationsEnabled  bool              `json:"notificationsEnabled" firestore:"notificationsEnabled"`
	SoundEnabled         bool              `json:"soundEnabled" firestore:"soundEnabled"`
	Theme               string            `json:"theme" firestore:"theme"`
	Language            string            `json:"language" firestore:"language"`
	AutoMatchmaking     bool              `json:"autoMatchmaking" firestore:"autoMatchmaking"`
	PreferredRegion     string            `json:"preferredRegion" firestore:"preferredRegion"`
	
	// Privacy settings
	ShowOnlineStatus    bool              `json:"showOnlineStatus" firestore:"showOnlineStatus"`
	AllowFriendRequests bool              `json:"allowFriendRequests" firestore:"allowFriendRequests"`
	
	// Matchmaking preferences
	MatchmakingPrefs    MatchmakingPreferences `json:"matchmakingPrefs" firestore:"matchmakingPrefs"`
}

// MatchmakingPreferences represents user's matchmaking preferences
type MatchmakingPreferences struct {
	SkillRange          int      `json:"skillRange"`          // ELO range tolerance
	MaxWaitTime         int      `json:"maxWaitTime"`         // Maximum wait time in seconds
	PreferredGameTypes  []string `json:"preferredGameTypes"`  // "quick", "ranked", "tournament"
	AllowBots          bool     `json:"allowBots"`           // Allow bot opponents
	ConnectionQuality   string   `json:"connectionQuality"`   // "any", "good", "excellent"
	GeographicPreference string   `json:"geographicPreference"` // "local", "regional", "global"
}
