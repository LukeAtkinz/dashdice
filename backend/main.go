package main

// DASHDICE UNIFIED BACKEND - Single Service for All Matchmaking
// Replaces: backend-simple, go-services, api-gateway, complex proxy routing
// Provides: Match creation, player matching, bot integration, real-time updates

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// Core data structures
type Match struct {
	MatchID    string    `json:"matchId"`
	Status     string    `json:"status"`      // waiting, active, completed
	GameMode   string    `json:"gameMode"`    // quickfire, classic, ranked
	Players    []Player  `json:"players"`
	MaxPlayers int       `json:"maxPlayers"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type Player struct {
	UserID   string `json:"userId"`
	UserName string `json:"userName"`
	IsBot    bool   `json:"isBot"`
	Status   string `json:"status"` // joined, ready, disconnected
}

type MatchRequest struct {
	GameMode string `json:"gameMode"`
	UserID   string `json:"userId"`
	UserName string `json:"userName"`
}

// In-memory storage (production would use Redis/Database)
var (
	matches      = make(map[string]*Match)
	matchesMutex = sync.RWMutex{}
	botCounter   = 0
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// API Routes - Simple and Clean
	http.HandleFunc("/health", handleHealth)
	http.HandleFunc("/api/v1/matches", handleMatches)           // GET: list, POST: create/join
	http.HandleFunc("/api/v1/matches/", handleSpecificMatch)   // GET/PUT/DELETE specific match
	http.HandleFunc("/api/v1/queue/join", handleQueueJoin)     // POST: find or create match
	http.HandleFunc("/api/v1/queue/status", handleQueueStatus) // GET: queue status

	// Start bot matching service
	go startBotMatchingService()

	log.Printf("🎲 DashDice Unified Backend starting on port %s", port)
	log.Printf("🔥 Features: Match creation, Player matching, Bot integration")
	log.Printf("🌐 Access: Railway deployment handles all matchmaking")
	
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// Health check
func handleHealth(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	w.Header().Set("Content-Type", "application/json")
	
	response := map[string]interface{}{
		"service":    "DashDice Unified Backend",
		"status":     "healthy",
		"message":    "All matchmaking services operational! 🎲",
		"version":    "v3.0-unified",
		"timestamp":  time.Now().Unix(),
		"features": []string{
			"Match Creation",
			"Player Matching", 
			"Bot Integration",
			"Queue Management",
		},
	}
	
	json.NewEncoder(w).Encode(response)
}

// Handle matches endpoint - list and create
func handleMatches(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
	if r.Method == "GET" {
		handleListMatches(w, r)
	} else if r.Method == "POST" {
		handleCreateMatch(w, r)
	} else {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

// List matches with filtering
func handleListMatches(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	gameMode := r.URL.Query().Get("gameMode")
	
	matchesMutex.RLock()
	var filteredMatches []Match
	
	for _, match := range matches {
		if status != "" && match.Status != status {
			continue
		}
		if gameMode != "" && match.GameMode != gameMode {
			continue
		}
		filteredMatches = append(filteredMatches, *match)
	}
	matchesMutex.RUnlock()
	
	response := map[string]interface{}{
		"success": true,
		"matches": filteredMatches,
		"total":   len(filteredMatches),
		"message": fmt.Sprintf("Found %d matches", len(filteredMatches)),
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Create new match
func handleCreateMatch(w http.ResponseWriter, r *http.Request) {
	var req MatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}
	
	if req.GameMode == "" || req.UserID == "" {
		http.Error(w, `{"error": "gameMode and userId required"}`, http.StatusBadRequest)
		return
	}
	
	// First, try to find existing waiting match
	matchesMutex.Lock()
	defer matchesMutex.Unlock()
	
	for _, existingMatch := range matches {
		if existingMatch.Status == "waiting" && 
		   existingMatch.GameMode == req.GameMode && 
		   len(existingMatch.Players) < existingMatch.MaxPlayers {
			
			// Check if player already in match
			for _, player := range existingMatch.Players {
				if player.UserID == req.UserID {
					w.Header().Set("Content-Type", "application/json")
					json.NewEncoder(w).Encode(map[string]interface{}{
						"success": true,
						"match":   existingMatch,
						"joined":  true,
						"message": "Already in this match",
					})
					return
				}
			}
			
			// Add player to existing match
			existingMatch.Players = append(existingMatch.Players, Player{
				UserID:   req.UserID,
				UserName: req.UserName,
				IsBot:    false,
				Status:   "joined",
			})
			existingMatch.UpdatedAt = time.Now()
			
			// Start match if full
			if len(existingMatch.Players) >= existingMatch.MaxPlayers {
				existingMatch.Status = "active"
			}
			
			log.Printf("🤝 Player %s joined match %s (%d/%d players)", 
				req.UserID, existingMatch.MatchID, len(existingMatch.Players), existingMatch.MaxPlayers)
			
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"match":   existingMatch,
				"joined":  true,
				"message": "Joined existing match",
			})
			return
		}
	}
	
	// Create new match
	matchID := fmt.Sprintf("match_%d_%s", time.Now().Unix(), req.UserID[:8])
	newMatch := &Match{
		MatchID:    matchID,
		Status:     "waiting",
		GameMode:   req.GameMode,
		MaxPlayers: 2, // Default for most game modes
		Players: []Player{{
			UserID:   req.UserID,
			UserName: req.UserName,
			IsBot:    false,
			Status:   "joined",
		}},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	
	matches[matchID] = newMatch
	
	log.Printf("🆕 Created match %s for player %s (mode: %s)", matchID, req.UserID, req.GameMode)
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"match":   newMatch,
		"created": true,
		"message": "New match created",
	})
}

// Handle specific match operations
func handleSpecificMatch(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
	// Extract match ID from URL
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/matches/")
	matchID := strings.Split(path, "/")[0]
	
	if matchID == "" {
		http.Error(w, `{"error": "Match ID required"}`, http.StatusBadRequest)
		return
	}
	
	switch r.Method {
	case "GET":
		handleGetMatch(w, matchID)
	case "PUT":
		handleUpdateMatch(w, r, matchID)
	case "DELETE":
		handleDeleteMatch(w, matchID)
	default:
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

// Get specific match
func handleGetMatch(w http.ResponseWriter, matchID string) {
	matchesMutex.RLock()
	match, exists := matches[matchID]
	matchesMutex.RUnlock()
	
	if !exists {
		http.Error(w, fmt.Sprintf(`{"error": "Match not found", "matchId": "%s"}`, matchID), http.StatusNotFound)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"match":   match,
	})
}

// Update match (join, leave, ready, etc.)
func handleUpdateMatch(w http.ResponseWriter, r *http.Request, matchID string) {
	var updateData map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}
	
	matchesMutex.Lock()
	defer matchesMutex.Unlock()
	
	match, exists := matches[matchID]
	if !exists {
		http.Error(w, fmt.Sprintf(`{"error": "Match not found", "matchId": "%s"}`, matchID), http.StatusNotFound)
		return
	}
	
	action, ok := updateData["action"].(string)
	if !ok {
		http.Error(w, `{"error": "Action required"}`, http.StatusBadRequest)
		return
	}
	
	switch action {
	case "join":
		handleJoinMatch(w, match, updateData)
	case "ready":
		handlePlayerReady(w, match, updateData)
	case "leave":
		handleLeaveMatch(w, match, updateData)
	default:
		http.Error(w, `{"error": "Unknown action"}`, http.StatusBadRequest)
	}
}

// Queue join endpoint - simplified matchmaking
func handleQueueJoin(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
	if r.Method != "POST" {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}
	
	var req MatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}
	
	// Use the same logic as create match
	handleCreateMatch(w, r)
}

// Queue status
func handleQueueStatus(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	matchesMutex.RLock()
	waitingMatches := 0
	activeMatches := 0
	
	for _, match := range matches {
		switch match.Status {
		case "waiting":
			waitingMatches++
		case "active":
			activeMatches++
		}
	}
	matchesMutex.RUnlock()
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":        true,
		"waitingMatches": waitingMatches,
		"activeMatches":  activeMatches,
		"totalMatches":   len(matches),
		"message":        "Queue status retrieved",
	})
}

// Helper functions
func handleJoinMatch(w http.ResponseWriter, match *Match, updateData map[string]interface{}) {
	userID, _ := updateData["userId"].(string)
	userName, _ := updateData["userName"].(string)
	
	if userID == "" {
		http.Error(w, `{"error": "userId required"}`, http.StatusBadRequest)
		return
	}
	
	// Check if already in match
	for _, player := range match.Players {
		if player.UserID == userID {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"match":   match,
				"message": "Already in match",
			})
			return
		}
	}
	
	// Add player
	match.Players = append(match.Players, Player{
		UserID:   userID,
		UserName: userName,
		IsBot:    false,
		Status:   "joined",
	})
	match.UpdatedAt = time.Now()
	
	// Start if full
	if len(match.Players) >= match.MaxPlayers {
		match.Status = "active"
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"match":   match,
		"message": "Joined match successfully",
	})
}

func handlePlayerReady(w http.ResponseWriter, match *Match, updateData map[string]interface{}) {
	userID, _ := updateData["userId"].(string)
	
	for i, player := range match.Players {
		if player.UserID == userID {
			match.Players[i].Status = "ready"
			match.UpdatedAt = time.Now()
			break
		}
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"match":   match,
		"message": "Player ready",
	})
}

func handleLeaveMatch(w http.ResponseWriter, match *Match, updateData map[string]interface{}) {
	userID, _ := updateData["userId"].(string)
	
	for i, player := range match.Players {
		if player.UserID == userID {
			match.Players = append(match.Players[:i], match.Players[i+1:]...)
			match.UpdatedAt = time.Now()
			
			if len(match.Players) == 0 {
				match.Status = "completed"
			}
			break
		}
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"match":   match,
		"message": "Left match",
	})
}

func handleDeleteMatch(w http.ResponseWriter, matchID string) {
	matchesMutex.Lock()
	delete(matches, matchID)
	matchesMutex.Unlock()
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Match deleted",
	})
}

// Bot matching service - runs in background
func startBotMatchingService() {
	log.Printf("🤖 Bot matching service started")
	
	ticker := time.NewTicker(5 * time.Second) // Check every 5 seconds
	defer ticker.Stop()
	
	for range ticker.C {
		addBotsToWaitingMatches()
	}
}

func addBotsToWaitingMatches() {
	matchesMutex.Lock()
	defer matchesMutex.Unlock()
	
	for _, match := range matches {
		if match.Status == "waiting" && len(match.Players) < match.MaxPlayers {
			// Check if match has been waiting long enough (10 seconds)
			if time.Since(match.CreatedAt) > 10*time.Second {
				// Add bot
				botCounter++
				botName := fmt.Sprintf("DashBot_%d", botCounter)
				
				match.Players = append(match.Players, Player{
					UserID:   fmt.Sprintf("bot_%d", botCounter),
					UserName: botName,
					IsBot:    true,
					Status:   "ready",
				})
				
				// Start match if full
				if len(match.Players) >= match.MaxPlayers {
					match.Status = "active"
				}
				
				match.UpdatedAt = time.Now()
				
				log.Printf("🤖 Added bot %s to match %s (%d/%d players)", 
					botName, match.MatchID, len(match.Players), match.MaxPlayers)
			}
		}
	}
}

// CORS helper
func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}