package main

import (
	"context"
	"sync"
	"time"
	
	"go.uber.org/zap"
	
	"github.com/LukeAtkinz/dashdice/go-services/shared/database"
	"github.com/LukeAtkinz/dashdice/go-services/shared/models"
)

// PresenceManager handles user presence tracking and management
type PresenceManager struct {
	logger    *zap.Logger
	dbManager database.DatabaseManager
	
	// In-memory presence cache for fast access
	presenceCache map[string]*models.UserPresence
	cacheMutex    sync.RWMutex
	
	// Presence update channels
	presenceUpdates chan *PresenceUpdate
	
	// Background processing
	stopChan      chan bool
	running       bool
	
	// Configuration
	config        *PresenceConfig
}

// PresenceUpdate represents a presence status update
type PresenceUpdate struct {
	UserID    string                 `json:"user_id"`
	Status    string                 `json:"status"`
	Platform  string                 `json:"platform"`
	InMatch   bool                   `json:"in_match"`
	MatchID   string                 `json:"match_id,omitempty"`
	Location  string                 `json:"location,omitempty"`
	CustomData map[string]interface{} `json:"custom_data,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

// PresenceConfig holds presence management configuration
type PresenceConfig struct {
	// Cache settings
	CacheSize       int
	CacheExpiry     time.Duration
	
	// Update batching
	BatchSize       int
	BatchInterval   time.Duration
	
	// Cleanup settings
	CleanupInterval time.Duration
	OfflineTimeout  time.Duration
	
	// Real-time sync
	RealtimeSync    bool
	SyncInterval    time.Duration
}

// PresenceStats contains presence statistics
type PresenceStats struct {
	TotalUsers      int                    `json:"total_users"`
	OnlineUsers     int                    `json:"online_users"`
	InMatchUsers    int                    `json:"in_match_users"`
	StatusBreakdown map[string]int         `json:"status_breakdown"`
	PlatformStats   map[string]int         `json:"platform_stats"`
	LastUpdated     time.Time              `json:"last_updated"`
}

// NewPresenceManager creates a new presence manager
func NewPresenceManager(logger *zap.Logger, dbManager database.DatabaseManager) *PresenceManager {
	config := &PresenceConfig{
		CacheSize:       10000,
		CacheExpiry:     5 * time.Minute,
		BatchSize:       100,
		BatchInterval:   2 * time.Second,
		CleanupInterval: 30 * time.Second,
		OfflineTimeout:  2 * time.Minute,
		RealtimeSync:    true,
		SyncInterval:    10 * time.Second,
	}
	
	return &PresenceManager{
		logger:          logger,
		dbManager:       dbManager,
		presenceCache:   make(map[string]*models.UserPresence),
		presenceUpdates: make(chan *PresenceUpdate, 1000),
		stopChan:        make(chan bool),
		running:         false,
		config:          config,
	}
}

// Start starts the presence manager
func (pm *PresenceManager) Start() {
	if pm.running {
		return
	}
	
	pm.running = true
	
	// Start background processes
	go pm.updateProcessor()
	go pm.cleanupRoutine()
	
	if pm.config.RealtimeSync {
		go pm.realtimeSyncRoutine()
	}
	
	// Load initial presence data
	go pm.loadInitialPresenceData()
	
	pm.logger.Info("Presence manager started")
}

// Stop stops the presence manager
func (pm *PresenceManager) Stop() {
	if !pm.running {
		return
	}
	
	pm.running = false
	close(pm.stopChan)
	
	// Flush remaining updates
	pm.flushPendingUpdates()
	
	pm.logger.Info("Presence manager stopped")
}

// UpdatePresence updates user presence status
func (pm *PresenceManager) UpdatePresence(userID string, update *PresenceUpdate) error {
	// Update local cache
	presence := &models.UserPresence{
		UserID:     userID,
		Status:     update.Status,
		LastSeen:   update.Timestamp,
		Platform:   update.Platform,
		InMatch:    update.InMatch,
		MatchID:    update.MatchID,
		Location:   update.Location,
		CustomData: update.CustomData,
	}
	
	pm.cacheMutex.Lock()
	pm.presenceCache[userID] = presence
	pm.cacheMutex.Unlock()
	
	// Queue for database update
	select {
	case pm.presenceUpdates <- update:
		return nil
	default:
		pm.logger.Warn("Presence update queue full, dropping update",
			zap.String("user_id", userID))
		return nil // Don't block on queue full
	}
}

// GetPresence retrieves user presence status
func (pm *PresenceManager) GetPresence(userID string) (*models.UserPresence, error) {
	// Check cache first
	pm.cacheMutex.RLock()
	presence, exists := pm.presenceCache[userID]
	pm.cacheMutex.RUnlock()
	
	if exists {
		return presence, nil
	}
	
	// Load from database
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	dbPresence, err := pm.dbManager.RealtimeDB().GetPresence(ctx, userID)
	if err != nil {
		// Return default offline presence
		return &models.UserPresence{
			UserID:     userID,
			Status:     "offline",
			LastSeen:   time.Time{},
			Platform:   "",
			InMatch:    false,
			CustomData: make(map[string]interface{}),
		}, nil
	}
	
	// Cache the result
	pm.cacheMutex.Lock()
	pm.presenceCache[userID] = dbPresence
	pm.cacheMutex.Unlock()
	
	return dbPresence, nil
}

// GetMultiplePresence retrieves presence for multiple users
func (pm *PresenceManager) GetMultiplePresence(userIDs []string) (map[string]*models.UserPresence, error) {
	result := make(map[string]*models.UserPresence)
	var missingUserIDs []string
	
	// Check cache first
	pm.cacheMutex.RLock()
	for _, userID := range userIDs {
		if presence, exists := pm.presenceCache[userID]; exists {
			result[userID] = presence
		} else {
			missingUserIDs = append(missingUserIDs, userID)
		}
	}
	pm.cacheMutex.RUnlock()
	
	// Load missing users from database
	if len(missingUserIDs) > 0 {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		
		for _, userID := range missingUserIDs {
			presence, err := pm.dbManager.RealtimeDB().GetPresence(ctx, userID)
			if err != nil {
				// Default offline presence
				presence = &models.UserPresence{
					UserID:     userID,
					Status:     "offline",
					LastSeen:   time.Time{},
					Platform:   "",
					InMatch:    false,
					CustomData: make(map[string]interface{}),
				}
			}
			
			result[userID] = presence
			
			// Cache the result
			pm.cacheMutex.Lock()
			pm.presenceCache[userID] = presence
			pm.cacheMutex.Unlock()
		}
	}
	
	return result, nil
}

// GetOnlineUsers returns list of currently online users
func (pm *PresenceManager) GetOnlineUsers() ([]*models.UserPresence, error) {
	pm.cacheMutex.RLock()
	defer pm.cacheMutex.RUnlock()
	
	var onlineUsers []*models.UserPresence
	now := time.Now()
	
	for _, presence := range pm.presenceCache {
		if presence.Status == "online" || 
		   (presence.Status != "offline" && now.Sub(presence.LastSeen) < pm.config.OfflineTimeout) {
			onlineUsers = append(onlineUsers, presence)
		}
	}
	
	return onlineUsers, nil
}

// GetUsersInMatches returns list of users currently in matches
func (pm *PresenceManager) GetUsersInMatches() ([]*models.UserPresence, error) {
	pm.cacheMutex.RLock()
	defer pm.cacheMutex.RUnlock()
	
	var inMatchUsers []*models.UserPresence
	
	for _, presence := range pm.presenceCache {
		if presence.InMatch {
			inMatchUsers = append(inMatchUsers, presence)
		}
	}
	
	return inMatchUsers, nil
}

// SetUserInMatch marks a user as being in a match
func (pm *PresenceManager) SetUserInMatch(userID, matchID string) error {
	update := &PresenceUpdate{
		UserID:    userID,
		Status:    "playing",
		InMatch:   true,
		MatchID:   matchID,
		Location:  "match",
		Timestamp: time.Now(),
	}
	
	return pm.UpdatePresence(userID, update)
}

// SetUserOutOfMatch marks a user as no longer in a match
func (pm *PresenceManager) SetUserOutOfMatch(userID string) error {
	update := &PresenceUpdate{
		UserID:    userID,
		Status:    "online",
		InMatch:   false,
		MatchID:   "",
		Location:  "lobby",
		Timestamp: time.Now(),
	}
	
	return pm.UpdatePresence(userID, update)
}

// SetUserOffline marks a user as offline
func (pm *PresenceManager) SetUserOffline(userID string) error {
	update := &PresenceUpdate{
		UserID:    userID,
		Status:    "offline",
		InMatch:   false,
		MatchID:   "",
		Location:  "",
		Timestamp: time.Now(),
	}
	
	return pm.UpdatePresence(userID, update)
}

// GetPresenceStats returns presence statistics
func (pm *PresenceManager) GetPresenceStats() *PresenceStats {
	pm.cacheMutex.RLock()
	defer pm.cacheMutex.RUnlock()
	
	stats := &PresenceStats{
		StatusBreakdown: make(map[string]int),
		PlatformStats:   make(map[string]int),
		LastUpdated:     time.Now(),
	}
	
	now := time.Now()
	
	for _, presence := range pm.presenceCache {
		stats.TotalUsers++
		
		// Count by status
		status := presence.Status
		if status != "offline" && now.Sub(presence.LastSeen) < pm.config.OfflineTimeout {
			stats.OnlineUsers++
			stats.StatusBreakdown[status]++
		} else {
			stats.StatusBreakdown["offline"]++
		}
		
		// Count in match
		if presence.InMatch {
			stats.InMatchUsers++
		}
		
		// Count by platform
		if presence.Platform != "" {
			stats.PlatformStats[presence.Platform]++
		}
	}
	
	return stats
}

// RemoveUserPresence removes user presence (when user is deleted)
func (pm *PresenceManager) RemoveUserPresence(userID string) error {
	// Remove from cache
	pm.cacheMutex.Lock()
	delete(pm.presenceCache, userID)
	pm.cacheMutex.Unlock()
	
	// Remove from database
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	return pm.dbManager.RealtimeDB().RemovePresence(ctx, userID)
}

// Private methods

// updateProcessor processes batched presence updates
func (pm *PresenceManager) updateProcessor() {
	ticker := time.NewTicker(pm.config.BatchInterval)
	defer ticker.Stop()
	
	var batch []*PresenceUpdate
	
	for {
		select {
		case update := <-pm.presenceUpdates:
			batch = append(batch, update)
			
			// Process batch if it reaches max size
			if len(batch) >= pm.config.BatchSize {
				pm.processBatch(batch)
				batch = batch[:0]
			}
			
		case <-ticker.C:
			// Process batch on timer
			if len(batch) > 0 {
				pm.processBatch(batch)
				batch = batch[:0]
			}
			
		case <-pm.stopChan:
			// Process remaining batch before stopping
			if len(batch) > 0 {
				pm.processBatch(batch)
			}
			return
		}
	}
}

// processBatch processes a batch of presence updates
func (pm *PresenceManager) processBatch(batch []*PresenceUpdate) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	for _, update := range batch {
		presence := &models.UserPresence{
			UserID:     update.UserID,
			Status:     update.Status,
			LastSeen:   update.Timestamp,
			Platform:   update.Platform,
			InMatch:    update.InMatch,
			MatchID:    update.MatchID,
			Location:   update.Location,
			CustomData: update.CustomData,
		}
		
		// Update in real-time database
		if err := pm.dbManager.RealtimeDB().SetPresence(ctx, update.UserID, presence); err != nil {
			pm.logger.Error("Failed to update user presence",
				zap.String("user_id", update.UserID),
				zap.Error(err))
		}
	}
	
	pm.logger.Debug("Processed presence batch", zap.Int("count", len(batch)))
}

// cleanupRoutine periodically cleans up stale presence data
func (pm *PresenceManager) cleanupRoutine() {
	ticker := time.NewTicker(pm.config.CleanupInterval)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			pm.cleanupStalePresence()
		case <-pm.stopChan:
			return
		}
	}
}

// cleanupStalePresence removes stale presence entries
func (pm *PresenceManager) cleanupStalePresence() {
	pm.cacheMutex.Lock()
	defer pm.cacheMutex.Unlock()
	
	now := time.Now()
	var staleUsers []string
	
	for userID, presence := range pm.presenceCache {
		// Mark users as offline if they haven't been seen for too long
		if presence.Status != "offline" && now.Sub(presence.LastSeen) > pm.config.OfflineTimeout {
			presence.Status = "offline"
			presence.InMatch = false
			presence.MatchID = ""
			
			// Queue offline update
			update := &PresenceUpdate{
				UserID:    userID,
				Status:    "offline",
				InMatch:   false,
				MatchID:   "",
				Timestamp: now,
			}
			
			select {
			case pm.presenceUpdates <- update:
			default:
				// Queue full, skip this update
			}
		}
		
		// Remove from cache if offline for too long
		if presence.Status == "offline" && now.Sub(presence.LastSeen) > pm.config.CacheExpiry {
			staleUsers = append(staleUsers, userID)
		}
	}
	
	// Remove stale entries
	for _, userID := range staleUsers {
		delete(pm.presenceCache, userID)
	}
	
	if len(staleUsers) > 0 {
		pm.logger.Debug("Cleaned up stale presence entries", zap.Int("count", len(staleUsers)))
	}
}

// realtimeSyncRoutine syncs presence data to real-time database
func (pm *PresenceManager) realtimeSyncRoutine() {
	ticker := time.NewTicker(pm.config.SyncInterval)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			pm.syncToRealtimeDB()
		case <-pm.stopChan:
			return
		}
	}
}

// syncToRealtimeDB syncs presence data to real-time database
func (pm *PresenceManager) syncToRealtimeDB() {
	pm.cacheMutex.RLock()
	presenceSnapshot := make(map[string]*models.UserPresence)
	for userID, presence := range pm.presenceCache {
		// Only sync online users
		if presence.Status != "offline" {
			presenceSnapshot[userID] = presence
		}
	}
	pm.cacheMutex.RUnlock()
	
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	// Batch update real-time database
	for userID, presence := range presenceSnapshot {
		if err := pm.dbManager.RealtimeDB().SetPresence(ctx, userID, presence); err != nil {
			pm.logger.Warn("Failed to sync presence to real-time DB",
				zap.String("user_id", userID),
				zap.Error(err))
		}
	}
	
	pm.logger.Debug("Synced presence to real-time DB", 
		zap.Int("online_users", len(presenceSnapshot)))
}

// loadInitialPresenceData loads existing presence data on startup
func (pm *PresenceManager) loadInitialPresenceData() {
	// This would typically query the database for recently active users
	// For now, we'll start with an empty cache
	
	pm.logger.Info("Initial presence data loaded")
}

// flushPendingUpdates processes all remaining updates in the queue
func (pm *PresenceManager) flushPendingUpdates() {
	var batch []*PresenceUpdate
	
	// Drain the update queue
	for {
		select {
		case update := <-pm.presenceUpdates:
			batch = append(batch, update)
		default:
			// Queue empty
			if len(batch) > 0 {
				pm.processBatch(batch)
			}
			return
		}
	}
}

// Helper methods for presence status validation
func (pm *PresenceManager) isValidStatus(status string) bool {
	validStatuses := []string{"online", "away", "busy", "playing", "offline"}
	for _, validStatus := range validStatuses {
		if status == validStatus {
			return true
		}
	}
	return false
}

func (pm *PresenceManager) sanitizeCustomData(data map[string]interface{}) map[string]interface{} {
	if data == nil {
		return make(map[string]interface{})
	}
	
	// Limit custom data size and validate types
	sanitized := make(map[string]interface{})
	count := 0
	
	for key, value := range data {
		if count >= 10 { // Limit to 10 custom fields
			break
		}
		
		// Only allow basic types
		switch value.(type) {
		case string, int, float64, bool:
			sanitized[key] = value
			count++
		}
	}
	
	return sanitized
}
