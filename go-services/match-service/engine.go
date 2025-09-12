package main

import (
	"context"
	"fmt"
	"sync"
	"time"
	
	"go.uber.org/zap"
	
	"github.com/LukeAtkinz/dashdice/go-services/shared/database"
	"github.com/LukeAtkinz/dashdice/go-services/shared/models"
)

// GameEngine manages all active matches and game logic
type GameEngine struct {
	logger    *zap.Logger
	dbManager database.DatabaseManager
	
	// Active matches
	activeMatches   map[string]*ActiveMatch
	matchesMutex    sync.RWMutex
	
	// Control channels
	stopChan        chan bool
	acceptingMatches bool
}

// ActiveMatch represents a match currently being processed
type ActiveMatch struct {
	Match     *models.Match
	State     *models.MatchState
	Players   map[string]*models.User
	
	// Game state
	CurrentTurn   int
	TurnDeadline  time.Time
	GamePhase     string
	
	// Communication
	UpdateChan    chan *models.GameAction
	StateChan     chan *models.MatchState
	
	// Synchronization
	mutex         sync.RWMutex
	lastActivity  time.Time
}

// NewGameEngine creates a new game engine instance
func NewGameEngine(logger *zap.Logger, dbManager database.DatabaseManager) *GameEngine {
	engine := &GameEngine{
		logger:          logger,
		dbManager:       dbManager,
		activeMatches:   make(map[string]*ActiveMatch),
		stopChan:        make(chan bool),
		acceptingMatches: true,
	}
	
	// Start background processes
	go engine.matchProcessingLoop()
	go engine.cleanupLoop()
	
	return engine
}

// CreateMatch creates and starts a new match
func (ge *GameEngine) CreateMatch(ctx context.Context, matchConfig *models.Match) (*models.Match, error) {
	if !ge.acceptingMatches {
		return nil, fmt.Errorf("game engine is shutting down")
	}
	
	// Validate match configuration
	if err := ge.validateMatchConfig(matchConfig); err != nil {
		return nil, fmt.Errorf("invalid match configuration: %w", err)
	}
	
	// Create initial match state
	initialState := &models.MatchState{
		ID:           matchConfig.ID,
		Status:       "waiting",
		CurrentTurn:  "", // Will be set when match starts
		GameMode:     matchConfig.GameMode,
		CreatedAt:    time.Now(),
		PlayerData:   make(map[string]models.MatchPlayer),
		Scores:       make(map[string]int),
		GameModeData: make(map[string]interface{}),
		Settings: models.MatchSettings{
			TimeLimit:         30, // 30 seconds per turn
			MaxTurns:          50, // Maximum turns before draw
			AllowReconnect:    true,
			SpectatorMode:     false,
			PauseOnDisconnect: true,
			WinCondition:      100, // Default win condition
			RollTimeLimit:     15,  // 15 seconds for rolling
			BankTimeLimit:     10,  // 10 seconds for banking
		},
		ConnectedPlayers: make([]string, 0),
		ActionHistory:   make([]models.GameAction, 0),
	}
	
	// Initialize player data
	players := make([]string, 0, len(matchConfig.Players))
	for _, playerID := range matchConfig.Players {
		players = append(players, playerID)
		initialState.PlayerData[playerID] = models.MatchPlayer{
			UserID:      playerID,
			DisplayName: playerID, // Default to playerID, can be enhanced later
			IsConnected: true,
			IsReady:     false,
			JoinedAt:    time.Now(),
			LastSeen:    time.Now(),
		}
		initialState.Scores[playerID] = 0
	}
	
	// Set the players list
	initialState.Players = players
	
	// Store match in database
	if err := ge.dbManager.StoreMatch(ctx, matchConfig); err != nil {
		return nil, fmt.Errorf("failed to store match: %w", err)
	}
	
	// Update match state in real-time database
	if err := ge.dbManager.UpdateMatchState(ctx, matchConfig.ID, initialState); err != nil {
		ge.logger.Error("Failed to update match state", zap.Error(err))
	}
	
	// Create active match
	activeMatch := &ActiveMatch{
		Match:        matchConfig,
		State:        initialState,
		Players:      make(map[string]*models.User),
		CurrentTurn:  0,
		TurnDeadline: time.Now().Add(30 * time.Second), // Default turn time
		GamePhase:    "setup",
		UpdateChan:   make(chan *models.GameAction, 100),
		StateChan:    make(chan *models.MatchState, 10),
		lastActivity: time.Now(),
	}
	
	// Load player data
	for _, playerID := range matchConfig.Players {
		user, err := ge.dbManager.GetUser(ctx, playerID)
		if err != nil {
			ge.logger.Warn("Failed to load player data", 
				zap.String("user_id", playerID), 
				zap.Error(err))
			continue
		}
		activeMatch.Players[playerID] = user
	}
	
	// Register active match
	ge.matchesMutex.Lock()
	ge.activeMatches[matchConfig.ID] = activeMatch
	ge.matchesMutex.Unlock()
	
	// Start match processing goroutine
	go ge.processMatch(activeMatch)
	
	ge.logger.Info("Match created and started",
		zap.String("match_id", matchConfig.ID),
		zap.String("game_mode", string(matchConfig.GameMode)),
		zap.Int("player_count", len(matchConfig.Players)))
	
	return matchConfig, nil
}

// GetMatch retrieves a match by ID
func (ge *GameEngine) GetMatch(matchID string) (*ActiveMatch, bool) {
	ge.matchesMutex.RLock()
	defer ge.matchesMutex.RUnlock()
	
	match, exists := ge.activeMatches[matchID]
	return match, exists
}

// ProcessGameAction processes a game action from a player
func (ge *GameEngine) ProcessGameAction(matchID string, action *models.GameAction) error {
	activeMatch, exists := ge.GetMatch(matchID)
	if !exists {
		return fmt.Errorf("match not found: %s", matchID)
	}
	
	// Validate action
	if err := ge.validateGameAction(activeMatch, action); err != nil {
		return fmt.Errorf("invalid game action: %w", err)
	}
	
	// Send action to match processing
	select {
	case activeMatch.UpdateChan <- action:
		ge.logger.Debug("Game action queued",
			zap.String("match_id", matchID),
			zap.String("action_type", action.Type),
			zap.String("player_id", action.PlayerID))
		return nil
	default:
		return fmt.Errorf("match update queue is full")
	}
}

// GetActiveMatchCount returns the number of active matches
func (ge *GameEngine) GetActiveMatchCount() int {
	ge.matchesMutex.RLock()
	defer ge.matchesMutex.RUnlock()
	return len(ge.activeMatches)
}

// StopAcceptingMatches stops accepting new matches
func (ge *GameEngine) StopAcceptingMatches() {
	ge.acceptingMatches = false
}

// WaitForMatches waits for all matches to finish or timeout
func (ge *GameEngine) WaitForMatches(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ctx.Done():
			ge.logger.Warn("Forced shutdown of remaining matches")
			return
		case <-ticker.C:
			count := ge.GetActiveMatchCount()
			if count == 0 {
				ge.logger.Info("All matches completed")
				return
			}
			ge.logger.Info("Waiting for matches to complete", zap.Int("remaining", count))
		}
	}
}

// Private methods

// processMatch handles a single match's lifecycle
func (ge *GameEngine) processMatch(activeMatch *ActiveMatch) {
	defer func() {
		// Clean up when match ends
		ge.matchesMutex.Lock()
		delete(ge.activeMatches, activeMatch.Match.ID)
		ge.matchesMutex.Unlock()
		
		// Close channels
		close(activeMatch.UpdateChan)
		close(activeMatch.StateChan)
	}()
	
	ge.logger.Info("Starting match processing",
		zap.String("match_id", activeMatch.Match.ID))
	
	// Initialize match based on game mode
	if err := ge.initializeMatch(activeMatch); err != nil {
		ge.logger.Error("Failed to initialize match", 
			zap.String("match_id", activeMatch.Match.ID),
			zap.Error(err))
		return
	}
	
	// Main game loop
	turnTimer := time.NewTicker(1 * time.Second)
	defer turnTimer.Stop()
	
	for {
		select {
		case action := <-activeMatch.UpdateChan:
			// Process game action
			if err := ge.executeGameAction(activeMatch, action); err != nil {
				ge.logger.Error("Failed to execute game action",
					zap.String("match_id", activeMatch.Match.ID),
					zap.String("action_type", action.Type),
					zap.Error(err))
				continue
			}
			
			activeMatch.lastActivity = time.Now()
			
			// Check for match end conditions
			if ge.checkMatchEnd(activeMatch) {
				ge.endMatch(activeMatch)
				return
			}
			
		case <-turnTimer.C:
			// Check turn timeout
			if time.Now().After(activeMatch.TurnDeadline) {
				ge.handleTurnTimeout(activeMatch)
			}
			
			// Check for match inactivity
			if time.Since(activeMatch.lastActivity) > 5*time.Minute {
				ge.logger.Warn("Match inactive, ending",
					zap.String("match_id", activeMatch.Match.ID))
				ge.endMatch(activeMatch)
				return
			}
			
		case <-ge.stopChan:
			ge.logger.Info("Stopping match processing",
				zap.String("match_id", activeMatch.Match.ID))
			ge.endMatch(activeMatch)
			return
		}
	}
}

// initializeMatch sets up the match based on game mode
func (ge *GameEngine) initializeMatch(activeMatch *ActiveMatch) error {
	switch activeMatch.Match.GameMode {
	case models.GameModeClassic:
		return ge.initializeClassicMatch(activeMatch)
	case models.GameModeBlitz:
		return ge.initializeBlitzMatch(activeMatch)
	case models.GameModeTournament:
		return ge.initializeTournamentMatch(activeMatch)
	case models.GameModeCustom:
		return ge.initializeCustomMatch(activeMatch)
	default:
		return fmt.Errorf("unsupported game mode: %s", activeMatch.Match.GameMode)
	}
}

// Game mode specific initialization
func (ge *GameEngine) initializeClassicMatch(activeMatch *ActiveMatch) error {
	// Set classic game parameters
	activeMatch.State.Status = "active"
	activeMatch.TurnDeadline = time.Now().Add(60 * time.Second) // 1 minute per turn
	
	// Initialize classic game state
	activeMatch.State.GameModeData = map[string]interface{}{
		"dice_count":    5,
		"max_rolls":     3,
		"current_rolls": 0,
		"target_score":  10000,
	}
	
	return ge.broadcastStateUpdate(activeMatch)
}

func (ge *GameEngine) initializeBlitzMatch(activeMatch *ActiveMatch) error {
	// Set blitz game parameters
	activeMatch.State.Status = "active"
	activeMatch.TurnDeadline = time.Now().Add(15 * time.Second) // 15 seconds per turn
	
	// Initialize blitz game state
	activeMatch.State.GameModeData = map[string]interface{}{
		"dice_count":    5,
		"max_rolls":     2,
		"current_rolls": 0,
		"target_score":  5000,
		"time_limit":    300, // 5 minutes total
	}
	
	return ge.broadcastStateUpdate(activeMatch)
}

func (ge *GameEngine) initializeTournamentMatch(activeMatch *ActiveMatch) error {
	// Set tournament parameters
	activeMatch.State.Status = "active"
	activeMatch.TurnDeadline = time.Now().Add(45 * time.Second)
	
	// Get bracket position from match settings
	var bracketPosition interface{}
	if activeMatch.Match.Settings != nil {
		bracketPosition = activeMatch.Match.Settings["bracket_position"]
	}
	
	// Initialize tournament game state
	activeMatch.State.GameModeData = map[string]interface{}{
		"dice_count":      5,
		"max_rolls":       3,
		"current_rolls":   0,
		"target_score":    8000,
		"elimination":     true,
		"bracket_position": bracketPosition,
	}
	
	return ge.broadcastStateUpdate(activeMatch)
}

func (ge *GameEngine) initializeCustomMatch(activeMatch *ActiveMatch) error {
	// Use custom settings from match configuration
	settings := activeMatch.Match.Settings
	
	activeMatch.State.Status = "active"
	
	// Apply custom turn time
	turnTime := 60 // default
	if val, ok := settings["turn_time"]; ok {
		if t, ok := val.(int); ok {
			turnTime = t
		}
	}
	activeMatch.TurnDeadline = time.Now().Add(time.Duration(turnTime) * time.Second)
	
	// Initialize custom game state
	activeMatch.State.GameModeData = map[string]interface{}{
		"dice_count":    settings["dice_count"],
		"max_rolls":     settings["max_rolls"],
		"current_rolls": 0,
		"target_score":  settings["target_score"],
		"custom_rules":  settings["custom_rules"],
	}
	
	return ge.broadcastStateUpdate(activeMatch)
}

// executeGameAction processes a specific game action
func (ge *GameEngine) executeGameAction(activeMatch *ActiveMatch, action *models.GameAction) error {
	activeMatch.mutex.Lock()
	defer activeMatch.mutex.Unlock()
	
	switch action.Type {
	case "roll_dice":
		return ge.handleRollDice(activeMatch, action)
	case "hold_dice":
		return ge.handleHoldDice(activeMatch, action)
	case "end_turn":
		return ge.handleEndTurn(activeMatch, action)
	case "chat":
		return ge.handleChatMessage(activeMatch, action)
	default:
		return fmt.Errorf("unknown action type: %s", action.Type)
	}
}

// Game action handlers
func (ge *GameEngine) handleRollDice(activeMatch *ActiveMatch, action *models.GameAction) error {
	// Implement dice rolling logic
	ge.logger.Debug("Processing dice roll",
		zap.String("match_id", activeMatch.Match.ID),
		zap.String("player_id", action.PlayerID))
	
	// Update state and broadcast
	return ge.broadcastStateUpdate(activeMatch)
}

func (ge *GameEngine) handleHoldDice(activeMatch *ActiveMatch, action *models.GameAction) error {
	// Implement dice holding logic
	return ge.broadcastStateUpdate(activeMatch)
}

func (ge *GameEngine) handleEndTurn(activeMatch *ActiveMatch, action *models.GameAction) error {
	// Move to next player
	activeMatch.CurrentTurn++
	activeMatch.TurnDeadline = time.Now().Add(60 * time.Second)
	
	// Update match state - convert turn index to player ID
	if len(activeMatch.State.Players) > 0 {
		activeMatch.State.CurrentTurn = activeMatch.State.Players[activeMatch.CurrentTurn % len(activeMatch.State.Players)]
	}
	
	return ge.broadcastStateUpdate(activeMatch)
}

func (ge *GameEngine) handleChatMessage(activeMatch *ActiveMatch, action *models.GameAction) error {
	// Handle in-game chat
	// This would typically broadcast to all players in the match
	return nil
}

// handleTurnTimeout handles when a player's turn times out
func (ge *GameEngine) handleTurnTimeout(activeMatch *ActiveMatch) {
	ge.logger.Info("Turn timeout",
		zap.String("match_id", activeMatch.Match.ID),
		zap.Int("turn", activeMatch.CurrentTurn))
	
	// Auto-end turn and move to next player
	action := &models.GameAction{
		ID:        fmt.Sprintf("timeout_%d", time.Now().Unix()),
		MatchID:   activeMatch.Match.ID,
		PlayerID:  "", // System action
		Type:      "end_turn",
		Timestamp: time.Now(),
		Data:      map[string]interface{}{"reason": "timeout"},
	}
	
	ge.executeGameAction(activeMatch, action)
}

// checkMatchEnd checks if the match should end
func (ge *GameEngine) checkMatchEnd(activeMatch *ActiveMatch) bool {
	// Check win conditions based on game mode
	for _, playerID := range activeMatch.State.Players {
		targetScore := 10000 // default
		if val, ok := activeMatch.State.GameModeData["target_score"]; ok {
			if score, ok := val.(int); ok {
				targetScore = score
			}
		}
		
		if playerScore, exists := activeMatch.State.Scores[playerID]; exists && playerScore >= targetScore {
			return true
		}
	}
	
	// Check time limits for blitz mode
	if activeMatch.Match.GameMode == models.GameModeBlitz {
		if timeLimit, ok := activeMatch.State.GameModeData["time_limit"]; ok {
			if limit, ok := timeLimit.(int); ok {
				if activeMatch.State.StartedAt != nil && time.Since(*activeMatch.State.StartedAt) > time.Duration(limit)*time.Second {
					return true
				}
			}
		}
	}
	
	return false
}

// endMatch finalizes a match
func (ge *GameEngine) endMatch(activeMatch *ActiveMatch) {
	activeMatch.mutex.Lock()
	defer activeMatch.mutex.Unlock()
	
	activeMatch.State.Status = "completed"
	now := time.Now()
	activeMatch.State.CompletedAt = &now
	
	// Determine winner
	maxScore := 0
	winnerID := ""
	for playerID, score := range activeMatch.State.Scores {
		if score > maxScore {
			maxScore = score
			winnerID = playerID
		}
	}
	
	if winnerID != "" {
		activeMatch.State.Winner = winnerID
		activeMatch.State.GameModeData["final_score"] = maxScore
	}
	
	ge.logger.Info("Match ended",
		zap.String("match_id", activeMatch.Match.ID),
		zap.String("winner", winnerID),
		zap.Int("final_score", maxScore))
	
	// Final state broadcast
	ge.broadcastStateUpdate(activeMatch)
	
	// Store final state
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	ge.dbManager.UpdateMatchState(ctx, activeMatch.Match.ID, activeMatch.State)
}

// broadcastStateUpdate sends state updates to all connected clients
func (ge *GameEngine) broadcastStateUpdate(activeMatch *ActiveMatch) error {
	// Update database
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	if err := ge.dbManager.UpdateMatchState(ctx, activeMatch.Match.ID, activeMatch.State); err != nil {
		ge.logger.Error("Failed to update match state in database", zap.Error(err))
	}
	
	// Send to state channel for WebSocket broadcasting
	select {
	case activeMatch.StateChan <- activeMatch.State:
		return nil
	default:
		return fmt.Errorf("state channel full")
	}
}

// Validation methods
func (ge *GameEngine) validateMatchConfig(match *models.Match) error {
	if match.ID == "" {
		return fmt.Errorf("match ID is required")
	}
	
	if len(match.Players) < 2 {
		return fmt.Errorf("at least 2 players required")
	}
	
	if len(match.Players) > 6 {
		return fmt.Errorf("maximum 6 players allowed")
	}
	
	return nil
}

func (ge *GameEngine) validateGameAction(activeMatch *ActiveMatch, action *models.GameAction) error {
	if action.MatchID != activeMatch.Match.ID {
		return fmt.Errorf("action match ID mismatch")
	}
	
	if activeMatch.State.Status != "active" {
		return fmt.Errorf("match is not active")
	}
	
	// Validate player is in the match
	playerExists := false
	for _, playerID := range activeMatch.State.Players {
		if playerID == action.PlayerID {
			playerExists = true
			break
		}
	}
	if !playerExists && action.PlayerID != "" { // Allow system actions with empty player ID
		return fmt.Errorf("player not in match")
	}
	
	return nil
}

// Background loops
func (ge *GameEngine) matchProcessingLoop() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			// Periodic maintenance tasks
			ge.performMaintenanceTasks()
		case <-ge.stopChan:
			return
		}
	}
}

func (ge *GameEngine) cleanupLoop() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			ge.cleanupInactiveMatches()
		case <-ge.stopChan:
			return
		}
	}
}

func (ge *GameEngine) performMaintenanceTasks() {
	// Perform periodic maintenance
	ge.logger.Debug("Performing maintenance tasks",
		zap.Int("active_matches", ge.GetActiveMatchCount()))
}

func (ge *GameEngine) cleanupInactiveMatches() {
	ge.matchesMutex.Lock()
	defer ge.matchesMutex.Unlock()
	
	for matchID, activeMatch := range ge.activeMatches {
		if time.Since(activeMatch.lastActivity) > 10*time.Minute {
			ge.logger.Info("Cleaning up inactive match",
				zap.String("match_id", matchID))
			
			// End the match due to inactivity
			go func(am *ActiveMatch) {
				ge.endMatch(am)
			}(activeMatch)
		}
	}
}
