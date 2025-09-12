package models

import (
	"time"
)

// Device represents a user's device for push notifications
type Device struct {
	ID           string    `json:"id" firestore:"id" redis:"id"`
	UserID       string    `json:"userId" firestore:"userId" redis:"userId"`
	DeviceType   string    `json:"deviceType" firestore:"deviceType" redis:"deviceType"`       // "ios", "android", "web"
	PushToken    string    `json:"pushToken" firestore:"pushToken" redis:"pushToken"`
	Platform     string    `json:"platform" firestore:"platform" redis:"platform"`             // "mobile", "desktop", "tablet"
	OS           string    `json:"os" firestore:"os" redis:"os"`                               // "iOS", "Android", "Windows", "macOS", "Linux"
	OSVersion    string    `json:"osVersion" firestore:"osVersion" redis:"osVersion"`
	AppVersion   string    `json:"appVersion" firestore:"appVersion" redis:"appVersion"`
	IsActive     bool      `json:"isActive" firestore:"isActive" redis:"isActive"`
	LastSeen     time.Time `json:"lastSeen" firestore:"lastSeen" redis:"lastSeen"`
	RegisteredAt time.Time `json:"registeredAt" firestore:"registeredAt" redis:"registeredAt"`
	UpdatedAt    time.Time `json:"updatedAt" firestore:"updatedAt" redis:"updatedAt"`
}

// GameMode represents a game mode configuration
type GameMode struct {
	ID              string                 `json:"id" firestore:"id" redis:"id"`
	Name            string                 `json:"name" firestore:"name" redis:"name"`
	DisplayName     string                 `json:"displayName" firestore:"displayName" redis:"displayName"`
	Description     string                 `json:"description" firestore:"description" redis:"description"`
	MinPlayers      int                    `json:"minPlayers" firestore:"minPlayers" redis:"minPlayers"`
	MaxPlayers      int                    `json:"maxPlayers" firestore:"maxPlayers" redis:"maxPlayers"`
	GameDuration    int                    `json:"gameDuration" firestore:"gameDuration" redis:"gameDuration"` // seconds
	IsActive        bool                   `json:"isActive" firestore:"isActive" redis:"isActive"`
	RequiresPremium bool                   `json:"requiresPremium" firestore:"requiresPremium" redis:"requiresPremium"`
	Settings        map[string]interface{} `json:"settings" firestore:"settings" redis:"settings"`
	CreatedAt       time.Time              `json:"createdAt" firestore:"createdAt" redis:"createdAt"`
	UpdatedAt       time.Time              `json:"updatedAt" firestore:"updatedAt" redis:"updatedAt"`
}

// GameModeSettings represents common game mode settings
type GameModeSettings struct {
	DiceCount       int    `json:"diceCount"`
	RoundLimit      int    `json:"roundLimit"`
	TimePerTurn     int    `json:"timePerTurn"` // seconds
	ScoreToWin      int    `json:"scoreToWin"`
	AllowSpectators bool   `json:"allowSpectators"`
	ChatEnabled     bool   `json:"chatEnabled"`
	Difficulty      string `json:"difficulty"` // "easy", "medium", "hard"
}
