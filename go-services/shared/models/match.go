package models

import (
	"time"
)

// Game mode constants
const (
	GameModeClassic    = "classic"
	GameModeBlitz      = "blitz"
	GameModeTournament = "tournament"
	GameModeCustom     = "custom"
)

// Match represents a simplified match record for database operations
type Match struct {
	ID          string            `json:"id" firestore:"id"`
	Status      string            `json:"status" firestore:"status"`
	Players     []string          `json:"players" firestore:"players"`
	PlayerIDs   []string          `json:"playerIds" firestore:"playerIds"`
	GameMode    string            `json:"gameMode" firestore:"gameMode"`
	Region      string            `json:"region,omitempty" firestore:"region"`
	CreatedAt   time.Time         `json:"createdAt" firestore:"createdAt"`
	UpdatedAt   time.Time         `json:"updatedAt" firestore:"updatedAt"`
	CompletedAt *time.Time        `json:"completedAt,omitempty" firestore:"completedAt"`
	Winner      string            `json:"winner,omitempty" firestore:"winner"`
	Scores      map[string]int    `json:"scores" firestore:"scores"`
	Settings    map[string]interface{} `json:"settings,omitempty" firestore:"settings"`
}

// MatchState represents the complete state of an active match
type MatchState struct {
	ID          string    `json:"id" redis:"id"`
	GameMode    string    `json:"gameMode" redis:"gameMode"`
	GameType    string    `json:"gameType" redis:"gameType"` // "quick", "ranked", "tournament"
	Status      string    `json:"status" redis:"status"`     // "waiting", "active", "paused", "completed", "abandoned"
	
	// Players
	Players     []string  `json:"players" redis:"players"`
	PlayerData  map[string]MatchPlayer `json:"playerData" redis:"playerData"`
	
	// Game state
	CurrentTurn string    `json:"currentTurn" redis:"currentTurn"`
	TurnNumber  int       `json:"turnNumber" redis:"turnNumber"`
	Scores      map[string]int `json:"scores" redis:"scores"`
	TurnScore   int       `json:"turnScore" redis:"turnScore"`
	
	// Last action
	LastRoll    *DiceRoll `json:"lastRoll,omitempty" redis:"lastRoll"`
	LastAction  *GameAction `json:"lastAction,omitempty" redis:"lastAction"`
	
	// Game mode specific data
	GameModeData map[string]interface{} `json:"gameModeData" redis:"gameModeData"`
	Multipliers  map[string]int        `json:"multipliers,omitempty" redis:"multipliers"`
	
	// Match metadata
	Region      string    `json:"region" redis:"region"`
	CreatedAt   time.Time `json:"createdAt" redis:"createdAt"`
	StartedAt   *time.Time `json:"startedAt,omitempty" redis:"startedAt"`
	UpdatedAt   time.Time `json:"updatedAt" redis:"updatedAt"`
	CompletedAt *time.Time `json:"completedAt,omitempty" redis:"completedAt"`
	
	// Match settings
	Settings    MatchSettings `json:"settings" redis:"settings"`
	
	// Real-time tracking
	ConnectedPlayers []string `json:"connectedPlayers" redis:"connectedPlayers"`
	Spectators      []string `json:"spectators,omitempty" redis:"spectators"`
	
	// Match history for recovery
	ActionHistory []GameAction `json:"actionHistory" redis:"actionHistory"`
	
	// Winner information
	Winner      string `json:"winner,omitempty" redis:"winner"`
	WinReason   string `json:"winReason,omitempty" redis:"winReason"`
}

// MatchPlayer represents a player in a match
type MatchPlayer struct {
	UserID      string    `json:"userId"`
	DisplayName string    `json:"displayName"`
	PhotoURL    string    `json:"photoURL"`
	EloRating   int       `json:"eloRating"`
	IsConnected bool      `json:"isConnected"`
	JoinedAt    time.Time `json:"joinedAt"`
	LastSeen    time.Time `json:"lastSeen"`
	
	// Player state
	IsReady     bool      `json:"isReady"`
	IsSpectator bool      `json:"isSpectator"`
	
	// Connection info
	ConnectionQuality string `json:"connectionQuality"`
	IPAddress        string `json:"ipAddress,omitempty"`
	UserAgent        string `json:"userAgent,omitempty"`
}

// MatchSettings represents configurable match settings
type MatchSettings struct {
	TimeLimit         int    `json:"timeLimit"`         // Time limit per turn in seconds
	MaxTurns          int    `json:"maxTurns"`          // Maximum turns before draw
	AllowReconnect    bool   `json:"allowReconnect"`    // Allow players to reconnect
	SpectatorMode     bool   `json:"spectatorMode"`     // Allow spectators
	PauseOnDisconnect bool   `json:"pauseOnDisconnect"` // Pause match when player disconnects
	
	// Game mode specific settings
	WinCondition      int    `json:"winCondition"`      // Points needed to win (varies by mode)
	RollTimeLimit     int    `json:"rollTimeLimit"`     // Time limit for dice rolling
	BankTimeLimit     int    `json:"bankTimeLimit"`     // Time limit for banking decision
}

// DiceRoll represents a dice roll action
type DiceRoll struct {
	PlayerID  string    `json:"playerId"`
	Dice1     int       `json:"dice1"`
	Dice2     int       `json:"dice2"`
	Total     int       `json:"total"`
	IsDouble  bool      `json:"isDouble"`
	Timestamp time.Time `json:"timestamp"`
	
	// Game mode specific data
	Multiplier    int    `json:"multiplier,omitempty"`
	BonusPoints   int    `json:"bonusPoints,omitempty"`
	SpecialEffect string `json:"specialEffect,omitempty"`
}

// GameAction represents any action taken in the game
type GameAction struct {
	ID        string                 `json:"id"`
	MatchID   string                 `json:"matchId"`
	PlayerID  string                 `json:"playerId"`
	Type      string                 `json:"type"` // "roll", "bank", "pass", "timeout", "disconnect", "reconnect"
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
	
	// Result of the action
	Success   bool   `json:"success"`
	Error     string `json:"error,omitempty"`
	
	// State changes caused by this action
	StateChanges map[string]interface{} `json:"stateChanges,omitempty"`
}

// GameActionResult represents the result of a game action
type GameActionResult struct {
	Success    bool                   `json:"success"`
	Message    string                 `json:"message"`
	Data       map[string]interface{} `json:"data"`
	
	// Dice roll specific
	Dice1      int    `json:"dice1,omitempty"`
	Dice2      int    `json:"dice2,omitempty"`
	Total      int    `json:"total,omitempty"`
	
	// Game state changes
	ScoreChange    int    `json:"scoreChange,omitempty"`
	NewScore       int    `json:"newScore,omitempty"`
	TurnOver       bool   `json:"turnOver"`
	GameOver       bool   `json:"gameOver"`
	Winner         string `json:"winner,omitempty"`
	
	// Next state
	NextPlayer     string `json:"nextPlayer,omitempty"`
	NextTurnNumber int    `json:"nextTurnNumber,omitempty"`
	
	// Special effects
	Multiplier     int      `json:"multiplier,omitempty"`
	BonusPoints    int      `json:"bonusPoints,omitempty"`
	SpecialEffect  string   `json:"specialEffect,omitempty"`
	Achievements   []string `json:"achievements,omitempty"`
}

// CreateMatchRequest represents a request to create a new match
type CreateMatchRequest struct {
	GameMode     string                 `json:"gameMode" binding:"required"`
	GameType     string                 `json:"gameType" binding:"required"`
	Players      []string               `json:"players" binding:"required,min=2,max=4"`
	Settings     MatchSettings          `json:"settings"`
	Region       string                 `json:"region"`
	Preferences  map[string]interface{} `json:"preferences,omitempty"`
}

// RollDiceRequest represents a request to roll dice
type RollDiceRequest struct {
	PlayerID string `json:"playerId" binding:"required"`
}

// BankScoreRequest represents a request to bank current score
type BankScoreRequest struct {
	PlayerID string `json:"playerId" binding:"required"`
}
