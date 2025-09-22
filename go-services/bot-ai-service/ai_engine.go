package main

import (
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"time"

	"go.uber.org/zap"
)

// BotAIEngine handles bot decision making and game logic
type BotAIEngine struct {
	profile      *BotProfile
	logger       *zap.Logger
	gameState    *GameStateAnalysis
	personality  *PersonalityMatrix
	emotional    *EmotionalState
	
	// Decision making components
	riskAnalyzer    *RiskAnalyzer
	patternMatcher  *PatternMatcher
	adaptiveEngine  *AdaptiveEngine
}

// GameStateAnalysis represents analyzed game state
type GameStateAnalysis struct {
	CurrentScore    int     `json:"currentScore"`
	OpponentScore   int     `json:"opponentScore"`
	TurnScore       int     `json:"turnScore"`
	RemainingTurns  int     `json:"remainingTurns"`
	GamePhase       string  `json:"gamePhase"` // "early", "mid", "late"
	Pressure        float64 `json:"pressure"`
	Momentum        float64 `json:"momentum"`
	RiskLevel       float64 `json:"riskLevel"`
}

// PersonalityMatrix represents bot personality traits
type PersonalityMatrix struct {
	Aggressiveness    float64 `json:"aggressiveness"`    // 0.0-1.0
	Cautiousness      float64 `json:"cautiousness"`      // 0.0-1.0
	RiskTolerance     float64 `json:"riskTolerance"`     // 0.0-1.0
	Adaptability      float64 `json:"adaptability"`      // 0.0-1.0
	Consistency       float64 `json:"consistency"`       // 0.0-1.0
	Patience          float64 `json:"patience"`          // 0.0-1.0
	ConfidenceLevel   float64 `json:"confidenceLevel"`   // 0.0-1.0
	PressureResponse  float64 `json:"pressureResponse"`  // 0.0-1.0
}

// EmotionalState represents bot's current emotional state
type EmotionalState struct {
	Confidence    float64 `json:"confidence"`    // 0.0-1.0
	Frustration   float64 `json:"frustration"`   // 0.0-1.0
	Pressure      float64 `json:"pressure"`      // 0.0-1.0
	Momentum      float64 `json:"momentum"`      // -1.0 to 1.0
	CurrentMood   string  `json:"currentMood"`   // "calm", "confident", "frustrated", "desperate"
}

// DecisionResult represents the bot's decision
type DecisionResult struct {
	Type        string      `json:"type"`        // "roll", "bank", "pass"
	Confidence  float64     `json:"confidence"`  // 0.0-1.0
	Reasoning   string      `json:"reasoning"`   // Human-readable explanation
	Data        interface{} `json:"data"`        // Action-specific data
	Delay       int         `json:"delay"`       // Response delay in milliseconds
}

// RiskAnalyzer analyzes game risk
type RiskAnalyzer struct {
	logger *zap.Logger
}

// PatternMatcher identifies game patterns
type PatternMatcher struct {
	logger *zap.Logger
	recentActions []string
}

// AdaptiveEngine handles opponent adaptation
type AdaptiveEngine struct {
	logger *zap.Logger
	opponentProfile map[string]interface{}
}

// NewBotAIEngine creates a new bot AI engine
func NewBotAIEngine(profile *BotProfile, logger *zap.Logger) *BotAIEngine {
	// Extract personality from profile
	personality := &PersonalityMatrix{
		Aggressiveness:   getFloatFromMap(profile.Personality, "aggressiveness", 0.5),
		Cautiousness:     getFloatFromMap(profile.Personality, "cautiousness", 0.5),
		RiskTolerance:    getFloatFromMap(profile.Personality, "riskTolerance", 0.5),
		Adaptability:     getFloatFromMap(profile.Personality, "adaptability", 0.5),
		Consistency:      getFloatFromMap(profile.Personality, "consistency", 0.7),
		Patience:         getFloatFromMap(profile.Personality, "patience", 0.5),
		ConfidenceLevel:  getFloatFromMap(profile.Personality, "confidenceLevel", 0.6),
		PressureResponse: getFloatFromMap(profile.Personality, "pressureResponse", 0.5),
	}

	// Extract emotional state from profile
	emotional := &EmotionalState{
		Confidence:  getFloatFromMap(profile.Emotional, "confidence", 0.6),
		Frustration: getFloatFromMap(profile.Emotional, "frustration", 0.1),
		Pressure:    getFloatFromMap(profile.Emotional, "pressure", 0.0),
		Momentum:    getFloatFromMap(profile.Emotional, "momentum", 0.0),
		CurrentMood: getStringFromMap(profile.Emotional, "currentMood", "calm"),
	}

	return &BotAIEngine{
		profile:     profile,
		logger:      logger,
		personality: personality,
		emotional:   emotional,
		riskAnalyzer: &RiskAnalyzer{
			logger: logger,
		},
		patternMatcher: &PatternMatcher{
			logger: logger,
			recentActions: make([]string, 0),
		},
		adaptiveEngine: &AdaptiveEngine{
			logger: logger,
			opponentProfile: make(map[string]interface{}),
		},
	}
}

// MakeDecision generates a bot decision based on game state
func (engine *BotAIEngine) MakeDecision(gameData interface{}, actionType string) (*DecisionResult, error) {
	// Convert game data to structured format
	gameState, err := engine.analyzeGameState(gameData)
	if err != nil {
		return nil, fmt.Errorf("failed to analyze game state: %w", err)
	}

	engine.gameState = gameState

	// Update emotional state based on game situation
	engine.updateEmotionalState(gameState)

	// Generate decision based on action type
	var decision *DecisionResult
	
	switch actionType {
	case "dice_roll":
		decision = engine.decideDiceRoll(gameState)
	case "bank_decision":
		decision = engine.decideBanking(gameState)
	case "turn_action":
		decision = engine.decideTurnAction(gameState)
	case "game_start":
		decision = engine.decideGameStart(gameState)
	default:
		return nil, fmt.Errorf("unknown action type: %s", actionType)
	}

	// Add human-like delays and errors
	decision = engine.applyHumanLikeModifications(decision, gameState)

	// Log decision for learning
	engine.logDecision(decision, gameState)

	return decision, nil
}

// ProcessMessage handles WebSocket messages from the game
func (engine *BotAIEngine) ProcessMessage(message map[string]interface{}) (map[string]interface{}, error) {
	messageType, exists := message["type"].(string)
	if !exists {
		return nil, fmt.Errorf("message missing type field")
	}

	switch messageType {
	case "game_state_update":
		return engine.handleGameStateUpdate(message)
	case "turn_start":
		return engine.handleTurnStart(message)
	case "dice_rolled":
		return engine.handleDiceRolled(message)
	case "player_banked":
		return engine.handlePlayerBanked(message)
	case "game_end":
		return engine.handleGameEnd(message)
	default:
		engine.logger.Debug("🤖 Unhandled message type",
			zap.String("type", messageType),
			zap.String("bot_id", engine.profile.ID))
		
		// Return acknowledgment for unknown messages
		return map[string]interface{}{
			"type": "ack",
			"original_type": messageType,
		}, nil
	}
}

// Decision making functions

func (engine *BotAIEngine) decideDiceRoll(gameState *GameStateAnalysis) *DecisionResult {
	// Analyze whether to continue rolling or bank
	shouldRoll := engine.calculateRollProbability(gameState)
	
	if shouldRoll > 0.5 {
		return &DecisionResult{
			Type:       "roll",
			Confidence: shouldRoll,
			Reasoning:  engine.generateRollReasoning(gameState, true),
			Data: map[string]interface{}{
				"action": "continue_rolling",
			},
			Delay: engine.calculateResponseDelay(),
		}
	} else {
		return &DecisionResult{
			Type:       "bank",
			Confidence: 1.0 - shouldRoll,
			Reasoning:  engine.generateRollReasoning(gameState, false),
			Data: map[string]interface{}{
				"action": "bank_score",
				"score":  gameState.TurnScore,
			},
			Delay: engine.calculateResponseDelay(),
		}
	}
}

func (engine *BotAIEngine) decideBanking(gameState *GameStateAnalysis) *DecisionResult {
	// Calculate banking probability based on personality and game state
	bankProbability := engine.calculateBankProbability(gameState)
	
	shouldBank := bankProbability > 0.6
	
	return &DecisionResult{
		Type:       "bank_decision",
		Confidence: bankProbability,
		Reasoning:  engine.generateBankReasoning(gameState, shouldBank),
		Data: map[string]interface{}{
			"should_bank": shouldBank,
			"turn_score":  gameState.TurnScore,
		},
		Delay: engine.calculateResponseDelay(),
	}
}

func (engine *BotAIEngine) decideTurnAction(gameState *GameStateAnalysis) *DecisionResult {
	// Comprehensive turn decision making
	actions := engine.evaluateAllTurnActions(gameState)
	bestAction := engine.selectBestAction(actions)
	
	return bestAction
}

func (engine *BotAIEngine) decideGameStart(gameState *GameStateAnalysis) *DecisionResult {
	return &DecisionResult{
		Type:       "game_start",
		Confidence: 1.0,
		Reasoning:  "Ready to start the game",
		Data: map[string]interface{}{
			"ready": true,
		},
		Delay: engine.calculateResponseDelay(),
	}
}

// Probability calculation functions

func (engine *BotAIEngine) calculateRollProbability(gameState *GameStateAnalysis) float64 {
	baseProbability := 0.5
	
	// Adjust based on turn score (higher score = less likely to roll)
	turnScoreMultiplier := math.Max(0.1, 1.0 - float64(gameState.TurnScore)/100.0)
	
	// Adjust based on game pressure
	pressureMultiplier := 1.0 + (gameState.Pressure * engine.personality.PressureResponse)
	
	// Adjust based on personality
	personalityMultiplier := engine.personality.RiskTolerance * (2.0 - engine.personality.Cautiousness)
	
	// Combine factors
	probability := baseProbability * turnScoreMultiplier * pressureMultiplier * personalityMultiplier
	
	// Apply emotional state
	probability *= (1.0 + engine.emotional.Confidence*0.2 - engine.emotional.Frustration*0.3)
	
	// Clamp to valid range
	return math.Max(0.0, math.Min(1.0, probability))
}

func (engine *BotAIEngine) calculateBankProbability(gameState *GameStateAnalysis) float64 {
	baseProbability := 0.4
	
	// Increase probability with higher turn scores
	if gameState.TurnScore > 50 {
		baseProbability += 0.3
	} else if gameState.TurnScore > 30 {
		baseProbability += 0.2
	}
	
	// Adjust based on game situation
	if gameState.CurrentScore < gameState.OpponentScore {
		// Behind - more likely to take risks
		baseProbability -= 0.2
	} else if gameState.CurrentScore > gameState.OpponentScore+50 {
		// Ahead - more conservative
		baseProbability += 0.2
	}
	
	// Apply personality
	baseProbability += engine.personality.Cautiousness * 0.3
	baseProbability -= engine.personality.Aggressiveness * 0.2
	
	// Apply emotional state
	if engine.emotional.CurrentMood == "frustrated" {
		baseProbability -= 0.2 // More likely to take risks when frustrated
	} else if engine.emotional.CurrentMood == "confident" {
		baseProbability += 0.1 // Slightly more conservative when confident
	}
	
	return math.Max(0.0, math.Min(1.0, baseProbability))
}

// Game state analysis

func (engine *BotAIEngine) analyzeGameState(gameData interface{}) (*GameStateAnalysis, error) {
	// Convert interface{} to map for easier access
	gameMap, ok := gameData.(map[string]interface{})
	if !ok {
		// Try to convert from JSON
		jsonData, err := json.Marshal(gameData)
		if err != nil {
			return nil, fmt.Errorf("invalid game data format")
		}
		
		err = json.Unmarshal(jsonData, &gameMap)
		if err != nil {
			return nil, fmt.Errorf("failed to parse game data")
		}
	}
	
	analysis := &GameStateAnalysis{
		CurrentScore:   getIntFromMap(gameMap, "currentScore", 0),
		OpponentScore:  getIntFromMap(gameMap, "opponentScore", 0),
		TurnScore:      getIntFromMap(gameMap, "turnScore", 0),
		RemainingTurns: getIntFromMap(gameMap, "remainingTurns", 10),
		GamePhase:      getStringFromMap(gameMap, "gamePhase", "early"),
	}
	
	// Calculate derived metrics
	analysis.Pressure = engine.calculatePressure(analysis)
	analysis.Momentum = engine.calculateMomentum(analysis)
	analysis.RiskLevel = engine.calculateRiskLevel(analysis)
	
	return analysis, nil
}

func (engine *BotAIEngine) calculatePressure(state *GameStateAnalysis) float64 {
	scoreDifference := float64(state.OpponentScore - state.CurrentScore)
	
	// Higher pressure when behind
	pressure := math.Max(0.0, scoreDifference/200.0)
	
	// Increase pressure in late game
	if state.GamePhase == "late" {
		pressure *= 1.5
	}
	
	return math.Min(1.0, pressure)
}

func (engine *BotAIEngine) calculateMomentum(state *GameStateAnalysis) float64 {
	// Simple momentum calculation based on score difference
	scoreDiff := float64(state.CurrentScore - state.OpponentScore)
	momentum := scoreDiff / 100.0
	
	// Clamp to [-1.0, 1.0]
	return math.Max(-1.0, math.Min(1.0, momentum))
}

func (engine *BotAIEngine) calculateRiskLevel(state *GameStateAnalysis) float64 {
	// Base risk on turn score
	risk := float64(state.TurnScore) / 100.0
	
	// Increase risk when behind
	if state.CurrentScore < state.OpponentScore {
		risk *= 1.3
	}
	
	return math.Min(1.0, risk)
}

// Emotional state management

func (engine *BotAIEngine) updateEmotionalState(gameState *GameStateAnalysis) {
	// Update confidence based on performance
	if gameState.CurrentScore > gameState.OpponentScore {
		engine.emotional.Confidence = math.Min(1.0, engine.emotional.Confidence + 0.05)
	} else {
		engine.emotional.Confidence = math.Max(0.0, engine.emotional.Confidence - 0.03)
	}
	
	// Update frustration based on pressure
	engine.emotional.Frustration = math.Min(1.0, engine.emotional.Frustration + gameState.Pressure*0.1)
	
	// Update pressure
	engine.emotional.Pressure = gameState.Pressure
	
	// Update momentum
	engine.emotional.Momentum = gameState.Momentum
	
	// Update mood based on emotional state
	engine.updateMood()
}

func (engine *BotAIEngine) updateMood() {
	if engine.emotional.Confidence > 0.8 {
		engine.emotional.CurrentMood = "confident"
	} else if engine.emotional.Frustration > 0.7 {
		engine.emotional.CurrentMood = "frustrated"
	} else if engine.emotional.Pressure > 0.8 {
		engine.emotional.CurrentMood = "desperate"
	} else {
		engine.emotional.CurrentMood = "calm"
	}
}

// Human-like modifications

func (engine *BotAIEngine) applyHumanLikeModifications(decision *DecisionResult, gameState *GameStateAnalysis) *DecisionResult {
	// Apply error rate
	if rand.Float64() < engine.profile.Config.ErrorRate {
		decision = engine.introduceError(decision, gameState)
	}
	
	// Adjust response time based on decision complexity
	complexityMultiplier := 1.0
	if decision.Confidence < 0.7 {
		complexityMultiplier = 1.5 // Take longer for uncertain decisions
	}
	
	decision.Delay = int(float64(decision.Delay) * complexityMultiplier)
	
	return decision
}

func (engine *BotAIEngine) introduceError(decision *DecisionResult, gameState *GameStateAnalysis) *DecisionResult {
	// Occasionally make suboptimal decisions to appear more human
	if decision.Type == "roll" && rand.Float64() < 0.3 {
		// Sometimes bank when we should roll
		decision.Type = "bank"
		decision.Reasoning = "Playing it safe this turn"
		decision.Confidence *= 0.7
	} else if decision.Type == "bank" && rand.Float64() < 0.2 {
		// Sometimes continue rolling when we should bank
		decision.Type = "roll"
		decision.Reasoning = "Feeling lucky, let's continue"
		decision.Confidence *= 0.6
	}
	
	return decision
}

func (engine *BotAIEngine) calculateResponseDelay() int {
	min := engine.profile.Config.MinResponseTime
	max := engine.profile.Config.MaxResponseTime
	
	// Base delay
	delay := min + rand.Intn(max-min)
	
	// Add emotional modifiers
	if engine.emotional.CurrentMood == "frustrated" {
		delay = int(float64(delay) * 0.8) // React faster when frustrated
	} else if engine.emotional.CurrentMood == "confident" {
		delay = int(float64(delay) * 1.2) // Take more time when confident
	}
	
	return delay
}

// Reasoning generation

func (engine *BotAIEngine) generateRollReasoning(gameState *GameStateAnalysis, shouldRoll bool) string {
	reasons := []string{}
	
	if shouldRoll {
		reasons = []string{
			"The turn score is still manageable",
			"I'm feeling confident about this roll",
			"Need more points to catch up",
			"Let's push for a bigger score",
			"The risk seems acceptable",
		}
	} else {
		reasons = []string{
			"Better to secure these points",
			"The risk is getting too high",
			"I'm satisfied with this turn's score",
			"Don't want to lose all these points",
			"Playing it safe this round",
		}
	}
	
	// Select random reason for variety
	return reasons[rand.Intn(len(reasons))]
}

func (engine *BotAIEngine) generateBankReasoning(gameState *GameStateAnalysis, shouldBank bool) string {
	if shouldBank {
		return "Banking these points to secure progress"
	} else {
		return "Going for more points this turn"
	}
}

// Message handlers

func (engine *BotAIEngine) handleGameStateUpdate(message map[string]interface{}) (map[string]interface{}, error) {
	return map[string]interface{}{
		"type": "state_acknowledged",
		"bot_id": engine.profile.ID,
	}, nil
}

func (engine *BotAIEngine) handleTurnStart(message map[string]interface{}) (map[string]interface{}, error) {
	return map[string]interface{}{
		"type": "turn_ready",
		"bot_id": engine.profile.ID,
		"ready": true,
	}, nil
}

func (engine *BotAIEngine) handleDiceRolled(message map[string]interface{}) (map[string]interface{}, error) {
	// Analyze the dice result and decide next action
	diceData := message["data"]
	
	decision, err := engine.MakeDecision(diceData, "dice_roll")
	if err != nil {
		return nil, err
	}
	
	return map[string]interface{}{
		"type": "dice_response",
		"bot_id": engine.profile.ID,
		"decision": decision,
	}, nil
}

func (engine *BotAIEngine) handlePlayerBanked(message map[string]interface{}) (map[string]interface{}, error) {
	// Update opponent analysis
	playerID := getStringFromMap(message, "player_id", "")
	if playerID != engine.profile.ID {
		// Opponent banked - analyze their strategy
		engine.adaptiveEngine.analyzeOpponentAction("bank", message)
	}
	
	return map[string]interface{}{
		"type": "bank_acknowledged",
		"bot_id": engine.profile.ID,
	}, nil
}

func (engine *BotAIEngine) handleGameEnd(message map[string]interface{}) (map[string]interface{}, error) {
	// Game ended - analyze performance for learning
	won := getBoolFromMap(message, "won", false)
	
	engine.logger.Info("🤖 Game ended",
		zap.String("bot_id", engine.profile.ID),
		zap.Bool("won", won))
	
	return map[string]interface{}{
		"type": "game_end_acknowledged",
		"bot_id": engine.profile.ID,
		"won": won,
	}, nil
}

// Action evaluation

func (engine *BotAIEngine) evaluateAllTurnActions(gameState *GameStateAnalysis) []*DecisionResult {
	actions := []*DecisionResult{}
	
	// Evaluate rolling
	rollDecision := engine.decideDiceRoll(gameState)
	actions = append(actions, rollDecision)
	
	// Evaluate banking
	bankDecision := engine.decideBanking(gameState)
	actions = append(actions, bankDecision)
	
	return actions
}

func (engine *BotAIEngine) selectBestAction(actions []*DecisionResult) *DecisionResult {
	if len(actions) == 0 {
		return &DecisionResult{
			Type:       "pass",
			Confidence: 0.5,
			Reasoning:  "No valid actions available",
			Data:       map[string]interface{}{},
			Delay:      1000,
		}
	}
	
	// Select action with highest confidence
	bestAction := actions[0]
	for _, action := range actions[1:] {
		if action.Confidence > bestAction.Confidence {
			bestAction = action
		}
	}
	
	return bestAction
}

// Decision logging

func (engine *BotAIEngine) logDecision(decision *DecisionResult, gameState *GameStateAnalysis) {
	engine.logger.Debug("🤖 Bot decision",
		zap.String("bot_id", engine.profile.ID),
		zap.String("decision_type", decision.Type),
		zap.Float64("confidence", decision.Confidence),
		zap.String("reasoning", decision.Reasoning),
		zap.Int("delay", decision.Delay),
		zap.Float64("pressure", gameState.Pressure),
		zap.String("mood", engine.emotional.CurrentMood))
	
	// Add to pattern matcher for learning
	engine.patternMatcher.recentActions = append(engine.patternMatcher.recentActions, decision.Type)
	if len(engine.patternMatcher.recentActions) > 10 {
		engine.patternMatcher.recentActions = engine.patternMatcher.recentActions[1:]
	}
}

// Adaptive engine methods

func (engine *AdaptiveEngine) analyzeOpponentAction(actionType string, data map[string]interface{}) {
	// Analyze opponent's play style for future adaptation
	engine.logger.Debug("🤖 Analyzing opponent action",
		zap.String("action", actionType),
		zap.Any("data", data))
	
	// Store opponent patterns for adaptation
	// This could be expanded to include machine learning
}

// Utility functions

func getIntFromMap(m map[string]interface{}, key string, defaultValue int) int {
	if val, exists := m[key]; exists {
		if intVal, ok := val.(int); ok {
			return intVal
		}
		if floatVal, ok := val.(float64); ok {
			return int(floatVal)
		}
	}
	return defaultValue
}

func getFloatFromMap(m map[string]interface{}, key string, defaultValue float64) float64 {
	if val, exists := m[key]; exists {
		if floatVal, ok := val.(float64); ok {
			return floatVal
		}
		if intVal, ok := val.(int); ok {
			return float64(intVal)
		}
	}
	return defaultValue
}

func getStringFromMap(m map[string]interface{}, key string, defaultValue string) string {
	if val, exists := m[key]; exists {
		if strVal, ok := val.(string); ok {
			return strVal
		}
	}
	return defaultValue
}

func getBoolFromMap(m map[string]interface{}, key string, defaultValue bool) bool {
	if val, exists := m[key]; exists {
		if boolVal, ok := val.(bool); ok {
			return boolVal
		}
	}
	return defaultValue
}
