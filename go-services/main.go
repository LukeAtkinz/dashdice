package main

// DEPLOYMENT TIMESTAMP: 2025-09-25 Individual Match Routing Fix
import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"
)

// Match represents a game match
type Match struct {
	MatchID  string   `json:"matchId"`
	Status   string   `json:"status"`
	GameMode string   `json:"gameMode"`
	Players  []string `json:"players"`
	Message  string   `json:"message"`
	CreatedAt int64   `json:"createdAt"`
}

// In-memory match storage (in production, this would be a database)
var (
	matchStore = make(map[string]*Match)
	matchMutex = sync.RWMutex{}
)

// MatchResponse represents the API response for matches
type MatchResponse struct {
	Matches []Match `json:"matches"`
	Total   int     `json:"total"`
	Status  string  `json:"status"`
	Message string  `json:"message"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// API endpoints first (most specific routes)
	http.HandleFunc("/api/v1/matches", handleMatches)
	http.HandleFunc("/api/v1/matches/", handleIndividualMatch) // Handle individual match requests

	// Health check
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"service": "DashDice API v2.1 - Fixed Routing", "status": "healthy", "message": "Railway backend running! 🚂", "deployment": "2025-09-25"}`)
	})

	http.HandleFunc("/api/v1/queue/join", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Content-Type", "application/json")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		fmt.Fprintf(w, `{"message": "Successfully joined queue via Go backend", "status": "success", "queuePosition": 1}`)
	})

	http.HandleFunc("/api/v1/queue/leave", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Content-Type", "application/json")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		fmt.Fprintf(w, `{"message": "Successfully left queue via Go backend", "status": "success"}`)
	})

	http.HandleFunc("/api/v1/queue/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Content-Type", "application/json")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		fmt.Fprintf(w, `{"queue_position": 1, "estimated_wait": "30s", "players_in_queue": 5, "status": "success"}`)
	})

	// Root endpoint (catch-all, must be last)
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"message": "DashDice API is live on Railway!", "status": "healthy", "timestamp": %d}`, time.Now().Unix())
	})

	log.Printf("🚂 DashDice Go Backend starting on port %s", port)
	log.Printf("🌐 Users access: https://www.dashdice.gg (Vercel)")
	log.Printf("🔧 Backend API: Railway handles the heavy lifting")
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// handleMatches handles both GET and POST requests to /api/v1/matches
func handleMatches(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Content-Type", "application/json")
	
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
	if r.Method == "GET" {
		// Parse query parameters
		params, err := url.ParseQuery(r.URL.RawQuery)
		if err != nil {
			http.Error(w, `{"error": "Invalid query parameters"}`, http.StatusBadRequest)
			return
		}
		
		// Check for specific query like ?status=active&limit=1
		status := params.Get("status")
		_ = params.Get("limit") // Handle limit parameter (currently not used)
		
		matchMutex.RLock()
		defer matchMutex.RUnlock()
		
		var matches []Match
		
		// Filter matches based on status
		for _, match := range matchStore {
			if status == "" || match.Status == status {
				matches = append(matches, *match)
			}
		}
		
		// If no matches found, return empty array
		if matches == nil {
			matches = []Match{}
		}
		
		response := MatchResponse{
			Matches: matches,
			Total:   len(matches),
			Status:  "success",
			Message: "Go backend active",
		}
		
		jsonData, err := json.Marshal(response)
		if err != nil {
			http.Error(w, `{"error": "Failed to marshal response"}`, http.StatusInternalServerError)
			return
		}
		
		w.Write(jsonData)
		
	} else if r.Method == "POST" {
		// Parse request body to get user info
		var requestData map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
			http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
			return
		}
		
		// Extract game mode and user ID from request
		gameMode := "quickfire" // Default
		if gm, ok := requestData["game_mode"].(string); ok {
			gameMode = gm
		}
		
		// Get user ID from settings or generate a placeholder
		var userId string
		if settings, ok := requestData["settings"].(map[string]interface{}); ok {
			if hostId, ok := settings["hostId"].(string); ok {
				userId = hostId
			}
		}
		if userId == "" {
			userId = fmt.Sprintf("user_%d", time.Now().Unix())
		}
		
		matchMutex.Lock()
		defer matchMutex.Unlock()
		
		// 🎯 MATCHMAKING LOGIC: Look for existing waiting matches
		var foundMatch *Match
		for _, match := range matchStore {
			// Check if match is waiting and has same game mode and space for players
			if match.Status == "waiting" && 
			   match.GameMode == gameMode && 
			   len(match.Players) < 2 {
				foundMatch = match
				break
			}
		}
		
		if foundMatch != nil {
			// 🤝 JOIN EXISTING MATCH
			// Add player to existing match
			foundMatch.Players = append(foundMatch.Players, userId)
			
			// If match is now full, change status to ready
			if len(foundMatch.Players) >= 2 {
				foundMatch.Status = "ready"
				foundMatch.Message = "Match ready - 2 players found!"
			} else {
				foundMatch.Message = fmt.Sprintf("Player joined - %d/2 players", len(foundMatch.Players))
			}
			
			// Return the existing match that player joined
			jsonData, err := json.Marshal(foundMatch)
			if err != nil {
				http.Error(w, `{"error": "Failed to join match"}`, http.StatusInternalServerError)
				return
			}
			
			log.Printf("🤝 Player %s joined existing match %s (%d/2 players)", userId, foundMatch.MatchID, len(foundMatch.Players))
			w.Write(jsonData)
			
		} else {
			// 🆕 CREATE NEW MATCH
			matchID := fmt.Sprintf("match-%d", time.Now().Unix())
			
			match := &Match{
				MatchID:   matchID,
				Status:    "waiting",
				GameMode:  gameMode,
				Players:   []string{userId},
				Message:   "Match created - waiting for players (1/2)",
				CreatedAt: time.Now().Unix(),
			}
			
			// Store match in memory
			matchStore[matchID] = match
			
			// Return the new match in the expected format
			response := map[string]interface{}{
				"match": match,
				"matchId": matchID,
				"success": true,
				"message": "Match created successfully via Go backend",
			}
			
			jsonData, err := json.Marshal(response)
			if err != nil {
				http.Error(w, `{"error": "Failed to create match"}`, http.StatusInternalServerError)
				return
			}
			
			log.Printf("🆕 Created new match %s for player %s", matchID, userId)
			w.Write(jsonData)
		}
	} else {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

// handleIndividualMatch handles requests to /api/v1/matches/{matchId}
func handleIndividualMatch(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Content-Type", "application/json")
	
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
	// Extract match ID from URL path
	path := r.URL.Path
	if len(path) < len("/api/v1/matches/") {
		http.Error(w, `{"error": "Match ID required"}`, http.StatusBadRequest)
		return
	}
	
	matchID := path[len("/api/v1/matches/"):]
	if matchID == "" {
		http.Error(w, `{"error": "Match ID required"}`, http.StatusBadRequest)
		return
	}
	
	if r.Method == "GET" {
		// Handle GET request (retrieve match)
		matchMutex.RLock()
		match, exists := matchStore[matchID]
		matchMutex.RUnlock()
		
		if !exists {
			http.Error(w, fmt.Sprintf(`{"error": "Match not found", "matchId": "%s"}`, matchID), http.StatusNotFound)
			return
		}
		
		// Return the match
		jsonData, err := json.Marshal(match)
		if err != nil {
			http.Error(w, `{"error": "Failed to retrieve match"}`, http.StatusInternalServerError)
			return
		}
		
		log.Printf("🔍 Retrieved match %s", matchID)
		w.Write(jsonData)
		
	} else if r.Method == "PUT" {
		// Handle PUT request (update match - add players, bots, etc.)
		var updateData map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
			http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
			return
		}
		
		matchMutex.Lock()
		match, exists := matchStore[matchID]
		if !exists {
			matchMutex.Unlock()
			http.Error(w, fmt.Sprintf(`{"error": "Match not found", "matchId": "%s"}`, matchID), http.StatusNotFound)
			return
		}
		
		// Handle different actions
		action, ok := updateData["action"].(string)
		if !ok {
			matchMutex.Unlock()
			http.Error(w, `{"error": "Action required"}`, http.StatusBadRequest)
			return
		}
		
		if action == "join" {
			// Add player/bot to match
			playerId, hasPlayerId := updateData["playerId"].(string)
			playerName, hasPlayerName := updateData["playerName"].(string)
			playerType, _ := updateData["playerType"].(string) // optional, defaults to "player"
			
			if !hasPlayerId || !hasPlayerName {
				matchMutex.Unlock()
				http.Error(w, `{"error": "playerId and playerName required for join action"}`, http.StatusBadRequest)
				return
			}
			
			// Check if player already in match
			for _, existingPlayer := range match.Players {
				if existingPlayer == playerId {
					matchMutex.Unlock()
					http.Error(w, fmt.Sprintf(`{"error": "Player %s already in match"}`, playerId), http.StatusBadRequest)
					return
				}
			}
			
			// Check if match has space
			if len(match.Players) >= 2 {
				matchMutex.Unlock()
				http.Error(w, `{"error": "Match is full"}`, http.StatusBadRequest)
				return
			}
			
			// Add player to match
			match.Players = append(match.Players, playerId)
			
			// Update match status if needed
			if len(match.Players) >= 2 {
				match.Status = "active"
				match.Message = "Match is full and ready"
			}
			
			matchMutex.Unlock()
			
			playerTypeDisplay := playerType
			if playerTypeDisplay == "" {
				playerTypeDisplay = "player"
			}
			
			log.Printf("🤖 Added %s %s (%s) to match %s - now has %d players", playerTypeDisplay, playerName, playerId, matchID, len(match.Players))
			
			// Return updated match
			response := map[string]interface{}{
				"match": match,
				"success": true,
				"message": fmt.Sprintf("%s %s joined match successfully", playerTypeDisplay, playerName),
			}
			
			jsonData, err := json.Marshal(response)
			if err != nil {
				http.Error(w, `{"error": "Failed to create response"}`, http.StatusInternalServerError)
				return
			}
			
			w.Write(jsonData)
			
		} else {
			matchMutex.Unlock()
			http.Error(w, fmt.Sprintf(`{"error": "Unsupported action: %s"}`, action), http.StatusBadRequest)
		}
		
	} else {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
	}
}
