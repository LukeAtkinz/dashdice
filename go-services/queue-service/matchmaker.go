package main

import (
	"context"
	"fmt"
	"math"
	"sort"
	"sync"
	"time"
	
	"go.uber.org/zap"
	
	"github.com/LukeAtkinz/dashdice/go-services/shared/database"
	"github.com/LukeAtkinz/dashdice/go-services/shared/models"
)

// Matchmaker handles the matchmaking logic and queue management
type Matchmaker struct {
	logger    *zap.Logger
	dbManager database.DatabaseManager
	
	// Queue management
	queues       map[string]*GameQueue
	queuesMutex  sync.RWMutex
	
	// Matchmaking configuration
	config       *MatchmakingConfig
	
	// Control channels
	stopChan     chan bool
	matchChan    chan *MatchFound
	running      bool
}

// GameQueue represents a queue for a specific game mode
type GameQueue struct {
	GameMode    string
	Players     []*QueuedPlayer
	MaxPlayers  int
	MinPlayers  int
	Mutex       sync.RWMutex
	Created     time.Time
	LastMatch   time.Time
}

// QueuedPlayer represents a player waiting in queue
type QueuedPlayer struct {
	Player    *models.QueuePlayer
	User      *models.User
	QueueTime time.Time
	Priority  int
}

// MatchFound represents a successful match
type MatchFound struct {
	GameMode      string
	Players       []*models.QueuePlayer
	MatchQuality  float64
	QueueTime     time.Duration
}

// MatchmakingConfig holds matchmaking configuration
type MatchmakingConfig struct {
	// Skill-based matchmaking
	SkillEnabled         bool
	SkillRangeBase       int     // Base ELO range for matching
	SkillRangeExpansion  float64 // How much to expand range over time
	MaxSkillRange        int     // Maximum ELO range
	
	// Time-based adjustments
	MaxWaitTime          time.Duration
	QualityThreshold     float64
	
	// Queue sizes
	DefaultMinPlayers    int
	DefaultMaxPlayers    int
	
	// Match frequency
	MatchmakingInterval  time.Duration
	QueueCleanupInterval time.Duration
}

// NewMatchmaker creates a new matchmaker instance
func NewMatchmaker(logger *zap.Logger, dbManager database.DatabaseManager) *Matchmaker {
	config := &MatchmakingConfig{
		SkillEnabled:         true,
		SkillRangeBase:       200,
		SkillRangeExpansion:  1.2,
		MaxSkillRange:        1000,
		MaxWaitTime:          5 * time.Minute,
		QualityThreshold:     0.7,
		DefaultMinPlayers:    2,
		DefaultMaxPlayers:    6,
		MatchmakingInterval:  2 * time.Second,
		QueueCleanupInterval: 30 * time.Second,
	}
	
	mm := &Matchmaker{
		logger:    logger,
		dbManager: dbManager,
		queues:    make(map[string]*GameQueue),
		config:    config,
		stopChan:  make(chan bool),
		matchChan: make(chan *MatchFound, 100),
		running:   false,
	}
	
	// Initialize queues for all game modes
	mm.initializeQueues()
	
	return mm
}

// Start starts the matchmaking engine
func (mm *Matchmaker) Start() {
	if mm.running {
		return
	}
	
	mm.running = true
	
	// Start matchmaking loop
	go mm.matchmakingLoop()
	
	// Start queue cleanup loop
	go mm.queueCleanupLoop()
	
	// Start match processing loop
	go mm.matchProcessingLoop()
	
	mm.logger.Info("Matchmaker started")
}

// Stop stops the matchmaking engine
func (mm *Matchmaker) Stop() {
	if !mm.running {
		return
	}
	
	mm.running = false
	close(mm.stopChan)
	
	mm.logger.Info("Matchmaker stopped")
}

// AddPlayerToQueue adds a player to a specific game mode queue
func (mm *Matchmaker) AddPlayerToQueue(ctx context.Context, gameMode string, queuePlayer *models.QueuePlayer) error {
	// Get user data for skill-based matching
	user, err := mm.dbManager.GetUser(ctx, queuePlayer.UserID)
	if err != nil {
		return fmt.Errorf("failed to get user data: %w", err)
	}
	
	// Create queued player
	queuedPlayer := &QueuedPlayer{
		Player:    queuePlayer,
		User:      user,
		QueueTime: time.Now(),
		Priority:  mm.calculatePriority(user, gameMode),
	}
	
	// Add to appropriate queue
	queue := mm.getOrCreateQueue(gameMode)
	queue.Mutex.Lock()
	defer queue.Mutex.Unlock()
	
	// Check if player is already in queue
	for _, existingPlayer := range queue.Players {
		if existingPlayer.Player.UserID == queuePlayer.UserID {
			return fmt.Errorf("player already in queue")
		}
	}
	
	// Add player to queue
	queue.Players = append(queue.Players, queuedPlayer)
	
	// Sort queue by priority and wait time
	mm.sortQueue(queue)
	
	mm.logger.Info("Player added to queue",
		zap.String("user_id", queuePlayer.UserID),
		zap.String("game_mode", string(gameMode)),
		zap.Int("queue_size", len(queue.Players)),
		zap.Int("priority", queuedPlayer.Priority))
	
	// Update queue in database
	return mm.updateQueueInDatabase(ctx, gameMode, queue)
}

// RemovePlayerFromQueue removes a player from a queue
func (mm *Matchmaker) RemovePlayerFromQueue(ctx context.Context, gameMode string, userID string) error {
	queue := mm.getQueue(gameMode)
	if queue == nil {
		return fmt.Errorf("queue not found for game mode: %s", gameMode)
	}
	
	queue.Mutex.Lock()
	defer queue.Mutex.Unlock()
	
	// Find and remove player
	for i, player := range queue.Players {
		if player.Player.UserID == userID {
			// Remove player from slice
			queue.Players = append(queue.Players[:i], queue.Players[i+1:]...)
			
			mm.logger.Info("Player removed from queue",
				zap.String("user_id", userID),
				zap.String("game_mode", string(gameMode)),
				zap.Int("queue_size", len(queue.Players)))
			
			// Update queue in database
			return mm.updateQueueInDatabase(ctx, gameMode, queue)
		}
	}
	
	return fmt.Errorf("player not found in queue")
}

// GetQueueStatus returns the status of a specific queue
func (mm *Matchmaker) GetQueueStatus(gameMode string) (*QueueStatus, error) {
	queue := mm.getQueue(gameMode)
	if queue == nil {
		return nil, fmt.Errorf("queue not found for game mode: %s", gameMode)
	}
	
	queue.Mutex.RLock()
	defer queue.Mutex.RUnlock()
	
	status := &QueueStatus{
		GameMode:     gameMode,
		PlayerCount:  len(queue.Players),
		MinPlayers:   queue.MinPlayers,
		MaxPlayers:   queue.MaxPlayers,
		AverageWait:  mm.calculateAverageWaitTime(queue),
		EstimatedWait: mm.estimateWaitTime(queue),
		LastMatch:    queue.LastMatch,
	}
	
	return status, nil
}

// GetPlayerPosition returns a player's position in queue
func (mm *Matchmaker) GetPlayerPosition(gameMode string, userID string) (int, error) {
	queue := mm.getQueue(gameMode)
	if queue == nil {
		return -1, fmt.Errorf("queue not found for game mode: %s", gameMode)
	}
	
	queue.Mutex.RLock()
	defer queue.Mutex.RUnlock()
	
	for i, player := range queue.Players {
		if player.Player.UserID == userID {
			return i + 1, nil // 1-indexed position
		}
	}
	
	return -1, fmt.Errorf("player not found in queue")
}

// GetStats returns matchmaking statistics
func (mm *Matchmaker) GetStats() *MatchmakingStats {
	mm.queuesMutex.RLock()
	defer mm.queuesMutex.RUnlock()
	
	stats := &MatchmakingStats{
		TotalQueues:    len(mm.queues),
		TotalPlayers:   0,
		AverageWait:    0,
		MatchesCreated: 0, // This would be tracked separately
		QueueDetails:   make(map[string]*QueueStatus),
	}
	
	totalWaitTime := time.Duration(0)
	playerCount := 0
	
	for gameMode, queue := range mm.queues {
		queue.Mutex.RLock()
		queuePlayerCount := len(queue.Players)
		avgWait := mm.calculateAverageWaitTime(queue)
		
		stats.TotalPlayers += queuePlayerCount
		totalWaitTime += avgWait * time.Duration(queuePlayerCount)
		playerCount += queuePlayerCount
		
		stats.QueueDetails[string(gameMode)] = &QueueStatus{
			GameMode:      gameMode,
			PlayerCount:   queuePlayerCount,
			MinPlayers:    queue.MinPlayers,
			MaxPlayers:    queue.MaxPlayers,
			AverageWait:   avgWait,
			EstimatedWait: mm.estimateWaitTime(queue),
			LastMatch:     queue.LastMatch,
		}
		queue.Mutex.RUnlock()
	}
	
	if playerCount > 0 {
		stats.AverageWait = totalWaitTime / time.Duration(playerCount)
	}
	
	return stats
}

// Private methods

// initializeQueues creates queues for all supported game modes
func (mm *Matchmaker) initializeQueues() {
	gameModes := []string{
		models.GameModeClassic,
		models.GameModeBlitz,
		models.GameModeTournament,
		models.GameModeCustom,
	}
	
	mm.queuesMutex.Lock()
	defer mm.queuesMutex.Unlock()
	
	for _, gameMode := range gameModes {
		mm.queues[gameMode] = &GameQueue{
			GameMode:   gameMode,
			Players:    make([]*QueuedPlayer, 0),
			MaxPlayers: mm.getMaxPlayersForMode(gameMode),
			MinPlayers: mm.getMinPlayersForMode(gameMode),
			Created:    time.Now(),
			LastMatch:  time.Time{},
		}
	}
}

// matchmakingLoop is the main matchmaking loop
func (mm *Matchmaker) matchmakingLoop() {
	ticker := time.NewTicker(mm.config.MatchmakingInterval)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			mm.processMatchmaking()
		case <-mm.stopChan:
			return
		}
	}
}

// processMatchmaking attempts to create matches from queues
func (mm *Matchmaker) processMatchmaking() {
	mm.queuesMutex.RLock()
	defer mm.queuesMutex.RUnlock()
	
	for gameMode, queue := range mm.queues {
		mm.processQueueForMatches(gameMode, queue)
	}
}

// processQueueForMatches attempts to create matches from a specific queue
func (mm *Matchmaker) processQueueForMatches(gameMode string, queue *GameQueue) {
	queue.Mutex.Lock()
	defer queue.Mutex.Unlock()
	
	if len(queue.Players) < queue.MinPlayers {
		return
	}
	
	// Find the best possible match
	match := mm.findBestMatch(gameMode, queue)
	if match != nil {
		// Remove matched players from queue
		mm.removeMatchedPlayers(queue, match.Players)
		
		// Send match for processing
		select {
		case mm.matchChan <- match:
			queue.LastMatch = time.Now()
			mm.logger.Info("Match found",
				zap.String("game_mode", string(gameMode)),
				zap.Int("players", len(match.Players)),
				zap.Float64("quality", match.MatchQuality),
				zap.Duration("avg_wait", match.QueueTime))
		default:
			mm.logger.Warn("Match channel full, dropping match")
			// Re-add players to queue if match channel is full
			for _, player := range match.Players {
				queuedPlayer := &QueuedPlayer{
					Player:    player,
					QueueTime: time.Now(),
				}
				queue.Players = append(queue.Players, queuedPlayer)
			}
		}
	}
}

// findBestMatch finds the best possible match from a queue
func (mm *Matchmaker) findBestMatch(gameMode string, queue *GameQueue) *MatchFound {
	if len(queue.Players) < queue.MinPlayers {
		return nil
	}
	
	// Try to find optimal match size (start with max, work down to min)
	for playerCount := queue.MaxPlayers; playerCount >= queue.MinPlayers; playerCount-- {
		if len(queue.Players) < playerCount {
			continue
		}
		
		// Find best combination of players
		bestMatch := mm.findBestPlayerCombination(queue.Players, playerCount, gameMode)
		if bestMatch != nil && bestMatch.MatchQuality >= mm.config.QualityThreshold {
			return bestMatch
		}
		
		// If we've been waiting too long, lower quality standards
		if mm.shouldRelaxQuality(queue) {
			if bestMatch != nil {
				return bestMatch
			}
		}
	}
	
	return nil
}

// findBestPlayerCombination finds the best combination of players
func (mm *Matchmaker) findBestPlayerCombination(players []*QueuedPlayer, targetCount int, gameMode string) *MatchFound {
	if len(players) < targetCount {
		return nil
	}
	
	// For small groups, try all combinations
	if targetCount <= 4 && len(players) <= 10 {
		return mm.findOptimalCombination(players, targetCount, gameMode)
	}
	
	// For larger groups, use heuristic approach
	return mm.findHeuristicCombination(players, targetCount, gameMode)
}

// findOptimalCombination finds the optimal combination by testing all possibilities
func (mm *Matchmaker) findOptimalCombination(players []*QueuedPlayer, targetCount int, gameMode string) *MatchFound {
	bestMatch := &MatchFound{
		GameMode:     gameMode,
		MatchQuality: 0,
	}
	
	// Generate combinations
	combinations := mm.generateCombinations(players, targetCount)
	
	for _, combo := range combinations {
		quality := mm.calculateMatchQuality(combo, gameMode)
		if quality > bestMatch.MatchQuality {
			bestMatch.Players = make([]*models.QueuePlayer, len(combo))
			for i, qp := range combo {
				bestMatch.Players[i] = qp.Player
			}
			bestMatch.MatchQuality = quality
			bestMatch.QueueTime = mm.calculateAverageQueueTime(combo)
		}
	}
	
	if bestMatch.MatchQuality == 0 {
		return nil
	}
	
	return bestMatch
}

// findHeuristicCombination uses a heuristic approach for larger groups
func (mm *Matchmaker) findHeuristicCombination(players []*QueuedPlayer, targetCount int, gameMode string) *MatchFound {
	// Sort players by wait time and priority
	sortedPlayers := make([]*QueuedPlayer, len(players))
	copy(sortedPlayers, players)
	
	sort.Slice(sortedPlayers, func(i, j int) bool {
		// Prioritize by wait time, then by priority
		timeDiff := sortedPlayers[j].QueueTime.Sub(sortedPlayers[i].QueueTime)
		if math.Abs(float64(timeDiff)) < float64(10*time.Second) {
			return sortedPlayers[i].Priority > sortedPlayers[j].Priority
		}
		return timeDiff > 0
	})
	
	// Start with the longest-waiting player
	selectedPlayers := []*QueuedPlayer{sortedPlayers[0]}
	
	// Add compatible players
	for len(selectedPlayers) < targetCount && len(selectedPlayers) < len(sortedPlayers) {
		bestCandidate := mm.findBestCandidate(selectedPlayers, sortedPlayers, gameMode)
		if bestCandidate != nil {
			selectedPlayers = append(selectedPlayers, bestCandidate)
		} else {
			break
		}
	}
	
	if len(selectedPlayers) < targetCount {
		return nil
	}
	
	// Calculate match quality
	quality := mm.calculateMatchQuality(selectedPlayers, gameMode)
	
	match := &MatchFound{
		GameMode:     gameMode,
		MatchQuality: quality,
		QueueTime:    mm.calculateAverageQueueTime(selectedPlayers),
		Players:      make([]*models.QueuePlayer, len(selectedPlayers)),
	}
	
	for i, qp := range selectedPlayers {
		match.Players[i] = qp.Player
	}
	
	return match
}

// calculateMatchQuality calculates the quality of a potential match
func (mm *Matchmaker) calculateMatchQuality(players []*QueuedPlayer, gameMode string) float64 {
	if len(players) < 2 {
		return 0
	}
	
	var skillQuality, timeQuality, sizeQuality float64
	
	// Skill-based quality (if enabled)
	if mm.config.SkillEnabled {
		skillQuality = mm.calculateSkillQuality(players)
	} else {
		skillQuality = 1.0
	}
	
	// Time-based quality (reward shorter wait times)
	timeQuality = mm.calculateTimeQuality(players)
	
	// Size quality (prefer fuller matches)
	maxPlayers := mm.getMaxPlayersForMode(gameMode)
	sizeQuality = float64(len(players)) / float64(maxPlayers)
	
	// Weight the factors
	quality := (skillQuality * 0.5) + (timeQuality * 0.3) + (sizeQuality * 0.2)
	
	return math.Min(quality, 1.0)
}

// calculateSkillQuality calculates skill-based match quality
func (mm *Matchmaker) calculateSkillQuality(players []*QueuedPlayer) float64 {
	if len(players) < 2 {
		return 1.0
	}
	
	// Get ELO ratings (using general rating from EloRatings map)
	ratings := make([]int, len(players))
	for i, player := range players {
		// Use default ELO or first available rating
		if player.User.Stats.EloRatings != nil && len(player.User.Stats.EloRatings) > 0 {
			for _, rating := range player.User.Stats.EloRatings {
				ratings[i] = rating
				break // Use first available rating
			}
		} else {
			ratings[i] = 1200 // Default ELO rating
		}
	}
	
	// Calculate standard deviation
	mean := 0.0
	for _, rating := range ratings {
		mean += float64(rating)
	}
	mean /= float64(len(ratings))
	
	variance := 0.0
	for _, rating := range ratings {
		diff := float64(rating) - mean
		variance += diff * diff
	}
	variance /= float64(len(ratings))
	stdDev := math.Sqrt(variance)
	
	// Convert to quality score (lower stdDev = higher quality)
	maxStdDev := float64(mm.config.MaxSkillRange / 2)
	quality := 1.0 - (stdDev / maxStdDev)
	
	return math.Max(quality, 0.0)
}

// calculateTimeQuality calculates time-based match quality
func (mm *Matchmaker) calculateTimeQuality(players []*QueuedPlayer) float64 {
	avgWaitTime := mm.calculateAverageQueueTime(players)
	
	// Quality decreases as wait time increases
	maxWait := mm.config.MaxWaitTime
	quality := 1.0 - (float64(avgWaitTime) / float64(maxWait))
	
	return math.Max(quality, 0.0)
}

// Helper functions

func (mm *Matchmaker) getOrCreateQueue(gameMode string) *GameQueue {
	mm.queuesMutex.Lock()
	defer mm.queuesMutex.Unlock()
	
	if queue, exists := mm.queues[gameMode]; exists {
		return queue
	}
	
	// Create new queue
	queue := &GameQueue{
		GameMode:   gameMode,
		Players:    make([]*QueuedPlayer, 0),
		MaxPlayers: mm.getMaxPlayersForMode(gameMode),
		MinPlayers: mm.getMinPlayersForMode(gameMode),
		Created:    time.Now(),
		LastMatch:  time.Time{},
	}
	
	mm.queues[gameMode] = queue
	return queue
}

func (mm *Matchmaker) getQueue(gameMode string) *GameQueue {
	mm.queuesMutex.RLock()
	defer mm.queuesMutex.RUnlock()
	
	return mm.queues[gameMode]
}

func (mm *Matchmaker) calculatePriority(user *models.User, gameMode string) int {
	priority := 100 // Base priority
	
	// Adjust based on user level (calculate from total matches)
	userLevel := user.Stats.TotalMatches / 10 // Simple level calculation
	priority += userLevel * 2
	
	// Adjust based on game mode preference
	for _, preferredMode := range user.Preferences.PreferredGameModes {
		if preferredMode == gameMode {
			priority += 50
			break
		}
	}
	
	return priority
}

func (mm *Matchmaker) sortQueue(queue *GameQueue) {
	sort.Slice(queue.Players, func(i, j int) bool {
		// Sort by wait time (descending), then by priority (descending)
		timeDiff := queue.Players[j].QueueTime.Sub(queue.Players[i].QueueTime)
		if math.Abs(float64(timeDiff)) < float64(10*time.Second) {
			return queue.Players[i].Priority > queue.Players[j].Priority
		}
		return timeDiff > 0
	})
}

func (mm *Matchmaker) getMaxPlayersForMode(gameMode string) int {
	switch gameMode {
	case models.GameModeBlitz:
		return 4 // Smaller matches for faster games
	case models.GameModeTournament:
		return 8 // Larger tournament brackets
	default:
		return mm.config.DefaultMaxPlayers
	}
}

func (mm *Matchmaker) getMinPlayersForMode(gameMode string) int {
	switch gameMode {
	case models.GameModeTournament:
		return 4 // Need at least 4 for tournament bracket
	default:
		return mm.config.DefaultMinPlayers
	}
}

func (mm *Matchmaker) calculateAverageWaitTime(queue *GameQueue) time.Duration {
	if len(queue.Players) == 0 {
		return 0
	}
	
	total := time.Duration(0)
	now := time.Now()
	
	for _, player := range queue.Players {
		total += now.Sub(player.QueueTime)
	}
	
	return total / time.Duration(len(queue.Players))
}

func (mm *Matchmaker) calculateAverageQueueTime(players []*QueuedPlayer) time.Duration {
	if len(players) == 0 {
		return 0
	}
	
	total := time.Duration(0)
	now := time.Now()
	
	for _, player := range players {
		total += now.Sub(player.QueueTime)
	}
	
	return total / time.Duration(len(players))
}

func (mm *Matchmaker) estimateWaitTime(queue *GameQueue) time.Duration {
	if len(queue.Players) < queue.MinPlayers {
		// Estimate based on recent match frequency
		if !queue.LastMatch.IsZero() {
			timeSinceLastMatch := time.Since(queue.LastMatch)
			return timeSinceLastMatch + (30 * time.Second) // Add buffer
		}
		return 2 * time.Minute // Default estimate
	}
	
	// Queue has enough players, match should happen soon
	return 30 * time.Second
}

func (mm *Matchmaker) shouldRelaxQuality(queue *GameQueue) bool {
	if len(queue.Players) == 0 {
		return false
	}
	
	// Check if oldest player has been waiting too long
	oldestWait := time.Since(queue.Players[0].QueueTime)
	return oldestWait > mm.config.MaxWaitTime
}

// Background processing loops

func (mm *Matchmaker) queueCleanupLoop() {
	ticker := time.NewTicker(mm.config.QueueCleanupInterval)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			mm.cleanupQueues()
		case <-mm.stopChan:
			return
		}
	}
}

func (mm *Matchmaker) matchProcessingLoop() {
	for {
		select {
		case match := <-mm.matchChan:
			go mm.processFoundMatch(match)
		case <-mm.stopChan:
			return
		}
	}
}

func (mm *Matchmaker) cleanupQueues() {
	mm.queuesMutex.RLock()
	defer mm.queuesMutex.RUnlock()
	
	for gameMode, queue := range mm.queues {
		queue.Mutex.Lock()
		
		// Remove players who have been waiting too long or are disconnected
		filteredPlayers := make([]*QueuedPlayer, 0, len(queue.Players))
		for _, player := range queue.Players {
			// Check if player is still valid (this would involve checking user status)
			if time.Since(player.QueueTime) < 10*time.Minute {
				filteredPlayers = append(filteredPlayers, player)
			} else {
				mm.logger.Info("Removing expired player from queue",
					zap.String("user_id", player.Player.UserID),
					zap.String("game_mode", string(gameMode)))
			}
		}
		
		queue.Players = filteredPlayers
		queue.Mutex.Unlock()
	}
}

func (mm *Matchmaker) processFoundMatch(match *MatchFound) {
	// This would typically call the Match Service to create a new match
	mm.logger.Info("Processing found match",
		zap.String("game_mode", string(match.GameMode)),
		zap.Int("players", len(match.Players)),
		zap.Float64("quality", match.MatchQuality))
	
	// Here you would make an HTTP call to the Match Service
	// to create the actual match with these players
}

// Database operations

func (mm *Matchmaker) updateQueueInDatabase(ctx context.Context, gameMode string, queue *GameQueue) error {
	// Update queue state in Redis for fast access
	queueKey := fmt.Sprintf("queue:%s", gameMode)
	
	// Store queue metadata
	queueData := map[string]interface{}{
		"game_mode":    gameMode,
		"player_count": len(queue.Players),
		"min_players":  queue.MinPlayers,
		"max_players":  queue.MaxPlayers,
		"last_updated": time.Now().Unix(),
	}
	
	if mm.dbManager.Redis() != nil {
		return mm.dbManager.Redis().Set(ctx, queueKey+":meta", queueData, 1*time.Hour)
	}
	
	return nil
}

// Utility methods for combination generation and candidate selection

func (mm *Matchmaker) generateCombinations(players []*QueuedPlayer, r int) [][]*QueuedPlayer {
	var combinations [][]*QueuedPlayer
	n := len(players)
	
	if r > n {
		return combinations
	}
	
	// Generate combinations recursively
	var generate func(start int, current []*QueuedPlayer)
	generate = func(start int, current []*QueuedPlayer) {
		if len(current) == r {
			combination := make([]*QueuedPlayer, len(current))
			copy(combination, current)
			combinations = append(combinations, combination)
			return
		}
		
		for i := start; i < n; i++ {
			generate(i+1, append(current, players[i]))
		}
	}
	
	generate(0, []*QueuedPlayer{})
	return combinations
}

func (mm *Matchmaker) findBestCandidate(selected []*QueuedPlayer, available []*QueuedPlayer, gameMode string) *QueuedPlayer {
	var bestCandidate *QueuedPlayer
	bestScore := -1.0
	
	for _, candidate := range available {
		// Check if candidate is already selected
		alreadySelected := false
		for _, selected := range selected {
			if selected.Player.UserID == candidate.Player.UserID {
				alreadySelected = true
				break
			}
		}
		if alreadySelected {
			continue
		}
		
		// Calculate compatibility score
		testGroup := append(selected, candidate)
		score := mm.calculateMatchQuality(testGroup, gameMode)
		
		if score > bestScore {
			bestScore = score
			bestCandidate = candidate
		}
	}
	
	return bestCandidate
}

func (mm *Matchmaker) removeMatchedPlayers(queue *GameQueue, matchedPlayers []*models.QueuePlayer) {
	// Create a set of matched player IDs for efficient lookup
	matchedIDs := make(map[string]bool)
	for _, player := range matchedPlayers {
		matchedIDs[player.UserID] = true
	}
	
	// Filter out matched players
	filteredPlayers := make([]*QueuedPlayer, 0, len(queue.Players))
	for _, queuedPlayer := range queue.Players {
		if !matchedIDs[queuedPlayer.Player.UserID] {
			filteredPlayers = append(filteredPlayers, queuedPlayer)
		}
	}
	
	queue.Players = filteredPlayers
}

// Data structures for API responses

type QueueStatus struct {
	GameMode      string         `json:"game_mode"`
	PlayerCount   int            `json:"player_count"`
	MinPlayers    int            `json:"min_players"`
	MaxPlayers    int            `json:"max_players"`
	AverageWait   time.Duration  `json:"average_wait"`
	EstimatedWait time.Duration  `json:"estimated_wait"`
	LastMatch     time.Time      `json:"last_match"`
}

type MatchmakingStats struct {
	TotalQueues    int                     `json:"total_queues"`
	TotalPlayers   int                     `json:"total_players"`
	AverageWait    time.Duration           `json:"average_wait"`
	MatchesCreated int                     `json:"matches_created"`
	QueueDetails   map[string]*QueueStatus `json:"queue_details"`
}
