package mainpackage main



// DashDice Railway Deployment Entry Pointimport (

// This serves as the main entry point for Railway deployment	"encoding/json"

// Routes to the unified backend service in /backend directory	"fmt"

	"log"

import (	"net/http"

	"encoding/json"	"time"

	"fmt")

	"log"

	"net/http"type Player struct {

	"os"	ID       string `json:"id"`

	"strings"	Username string `json:"username"`

	"sync"	JoinedAt int64  `json:"joinedAt"`

	"time"}

)

type Match struct {

// Core data structures	ID      string   `json:"id"`

type Match struct {	Players []Player `json:"players"`

	MatchID    string    `json:"matchId"`	Status  string   `json:"status"`

	Status     string    `json:"status"`      // waiting, active, completed	Created int64    `json:"created"`

	GameMode   string    `json:"gameMode"`    // quickfire, classic, ranked}

	Players    []Player  `json:"players"`

	MaxPlayers int       `json:"maxPlayers"`// Simple in-memory storage

	CreatedAt  time.Time `json:"createdAt"`var matches = make(map[string]*Match)

	UpdatedAt  time.Time `json:"updatedAt"`var waitingPlayers = make([]Player, 0)

}

func enableCORS(w http.ResponseWriter) {

type Player struct {	w.Header().Set("Access-Control-Allow-Origin", "*")

	UserID   string `json:"userId"`	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

	UserName string `json:"userName"`	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	IsBot    bool   `json:"isBot"`}

	Status   string `json:"status"` // joined, ready, disconnected

}func healthHandler(w http.ResponseWriter, r *http.Request) {

	enableCORS(w)

type MatchRequest struct {	

	GameMode string `json:"gameMode"`	response := map[string]interface{}{

	UserID   string `json:"userId"`		"status":    "healthy",

	UserName string `json:"userName"`		"service":   "DashDice Simple Backend",

}		"version":   "v1.0-simple",

		"timestamp": time.Now().Unix(),

type QueueRequest struct {		"message":   "Simple matchmaking ready! 🎲",

	GameMode string `json:"gameMode"`	}

	UserID   string `json:"userId"`	

	UserName string `json:"userName"`	w.Header().Set("Content-Type", "application/json")

}	json.NewEncoder(w).Encode(response)

}

// In-memory storage (production would use Redis/Database)

var (func matchesHandler(w http.ResponseWriter, r *http.Request) {

	matches      = make(map[string]*Match)	enableCORS(w)

	matchesMutex = sync.RWMutex{}	

	botCounter   = 0	if r.Method == "OPTIONS" {

	queue        = make([]QueueRequest, 0)		return

	queueMutex   = sync.RWMutex{}	}

)	

	if r.Method == "POST" {

func main() {		createMatch(w, r)

	port := os.Getenv("PORT")		return

	if port == "" {	}

		port = "8080"	

	}	// GET - return all matches

	matchList := make([]*Match, 0)

	log.Printf("🚀 DashDice Go Backend starting on port %s", port)	for _, match := range matches {

	log.Printf("🌍 Environment: %s", os.Getenv("ENVIRONMENT"))		matchList = append(matchList, match)

	}

	// Health check endpoint	

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {	w.Header().Set("Content-Type", "application/json")

		w.Header().Set("Content-Type", "application/json")	json.NewEncoder(w).Encode(matchList)

		w.Header().Set("Access-Control-Allow-Origin", "*")}

		json.NewEncoder(w).Encode(map[string]interface{}{

			"status":    "ok",func createMatch(w http.ResponseWriter, r *http.Request) {

			"timestamp": time.Now(),	var player Player

			"service":   "dashdice-go-backend",	if err := json.NewDecoder(r.Body).Decode(&player); err != nil {

			"version":   "1.0.0",		http.Error(w, `{"error": "Invalid player data"}`, http.StatusBadRequest)

		})		return

	})	}

	

	// CORS middleware	player.JoinedAt = time.Now().Unix()

	corsHandler := func(next http.HandlerFunc) http.HandlerFunc {	

		return func(w http.ResponseWriter, r *http.Request) {	log.Printf("Player %s (%s) looking for match", player.Username, player.ID)

			w.Header().Set("Access-Control-Allow-Origin", "*")	

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")	// Check if there's someone waiting

			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")	if len(waitingPlayers) > 0 {

		// Match found! Create a game with the waiting player

			if r.Method == "OPTIONS" {		waitingPlayer := waitingPlayers[0]

				w.WriteHeader(http.StatusOK)		waitingPlayers = waitingPlayers[1:] // Remove the waiting player

				return		

			}		matchID := fmt.Sprintf("match_%d", time.Now().UnixNano())

		match := &Match{

			next(w, r)			ID:      matchID,

		}			Players: []Player{waitingPlayer, player},

	}			Status:  "active",

			Created: time.Now().Unix(),

	// API Routes for matchmaking		}

	http.HandleFunc("/api/v1/matches", corsHandler(handleMatches))		

	http.HandleFunc("/api/v1/queue/join", corsHandler(handleQueueJoin))		matches[matchID] = match

	http.HandleFunc("/", corsHandler(func(w http.ResponseWriter, r *http.Request) {		

		w.Header().Set("Content-Type", "application/json")		log.Printf("✅ Match created: %s vs %s", waitingPlayer.Username, player.Username)

		json.NewEncoder(w).Encode(map[string]string{		

			"message": "DashDice Go Backend API",		w.Header().Set("Content-Type", "application/json")

			"status":  "running",		json.NewEncoder(w).Encode(match)

		})		return

	}))	}

	

	// Start bot automation	// No one waiting, add this player to the queue

	go startBotAutomation()	waitingPlayers = append(waitingPlayers, player)

	

	log.Printf("✅ Server ready on http://localhost:%s", port)	log.Printf("⏳ Player %s added to waiting queue", player.Username)

	log.Fatal(http.ListenAndServe(":"+port, nil))	

}	response := map[string]interface{}{

		"status":  "waiting",

func handleMatches(w http.ResponseWriter, r *http.Request) {		"message": "Looking for opponent...",

	switch r.Method {		"player":  player,

	case "GET":	}

		handleGetMatches(w, r)	

	case "POST":	w.Header().Set("Content-Type", "application/json")

		handleCreateMatch(w, r)	json.NewEncoder(w).Encode(response)

	default:}

		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)

	}func statusHandler(w http.ResponseWriter, r *http.Request) {

}	enableCORS(w)

	

func handleGetMatches(w http.ResponseWriter, r *http.Request) {	status := map[string]interface{}{

	status := r.URL.Query().Get("status")		"waitingPlayers": len(waitingPlayers),

	gameMode := r.URL.Query().Get("game_mode")		"activeMatches":  len(matches),

		"totalPlayers":   len(waitingPlayers) + (len(matches) * 2),

	matchesMutex.RLock()	}

	defer matchesMutex.RUnlock()	

	w.Header().Set("Content-Type", "application/json")

	var filteredMatches []*Match	json.NewEncoder(w).Encode(status)

	for _, match := range matches {}

		if status != "" && match.Status != status {

			continuefunc main() {

		}	http.HandleFunc("/health", healthHandler)

		if gameMode != "" && match.GameMode != gameMode {	http.HandleFunc("/matches", matchesHandler)

			continue	http.HandleFunc("/status", statusHandler)

		}	

		filteredMatches = append(filteredMatches, match)	port := "8080"

	}	log.Printf("🚀 Simple DashDice backend starting on port %s", port)

	log.Printf("📊 Endpoints:")

	w.Header().Set("Content-Type", "application/json")	log.Printf("   GET  /health  - Health check")

	json.NewEncoder(w).Encode(map[string]interface{}{	log.Printf("   POST /matches - Find/create match")

		"success": true,	log.Printf("   GET  /matches - List all matches")

		"matches": filteredMatches,	log.Printf("   GET  /status  - System status")

		"count":   len(filteredMatches),	

	})	if err := http.ListenAndServe(":"+port, nil); err != nil {

}		log.Fatal("Server failed to start:", err)

	}

func handleCreateMatch(w http.ResponseWriter, r *http.Request) {}
	var req MatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	matchesMutex.Lock()
	defer matchesMutex.Unlock()

	// Create new match
	matchID := fmt.Sprintf("match_%d", time.Now().UnixNano())
	match := &Match{
		MatchID:    matchID,
		Status:     "waiting",
		GameMode:   req.GameMode,
		MaxPlayers: 2, // Default for most game modes
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
		Players: []Player{
			{
				UserID:   req.UserID,
				UserName: req.UserName,
				IsBot:    false,
				Status:   "joined",
			},
		},
	}

	matches[matchID] = match

	log.Printf("✅ Created new match: %s for user %s (%s)", matchID, req.UserName, req.GameMode)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"matchId": matchID,
		"match":   match,
	})
}

func handleQueueJoin(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req QueueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Check for existing waiting matches first
	matchesMutex.RLock()
	for _, match := range matches {
		if match.Status == "waiting" && match.GameMode == req.GameMode && len(match.Players) < match.MaxPlayers {
			matchesMutex.RUnlock()
			
			// Join existing match
			matchesMutex.Lock()
			match.Players = append(match.Players, Player{
				UserID:   req.UserID,
				UserName: req.UserName,
				IsBot:    false,
				Status:   "joined",
			})
			
			if len(match.Players) >= match.MaxPlayers {
				match.Status = "active"
			}
			match.UpdatedAt = time.Now()
			matchesMutex.Unlock()

			log.Printf("✅ User %s joined existing match: %s", req.UserName, match.MatchID)

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"matchId": match.MatchID,
				"joined":  true,
			})
			return
		}
	}
	matchesMutex.RUnlock()

	// Add to queue for new match creation
	queueMutex.Lock()
	queue = append(queue, req)
	queueMutex.Unlock()

	log.Printf("✅ User %s added to queue for %s", req.UserName, req.GameMode)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"queued":  true,
		"message": "Added to matchmaking queue",
	})
}

func startBotAutomation() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		addBotsToWaitingMatches()
		processQueue()
	}
}

func addBotsToWaitingMatches() {
	matchesMutex.Lock()
	defer matchesMutex.Unlock()

	for _, match := range matches {
		if match.Status == "waiting" && len(match.Players) < match.MaxPlayers {
			// Check if match has been waiting for more than 30 seconds
			if time.Since(match.CreatedAt) > 30*time.Second {
				botCounter++
				botName := fmt.Sprintf("Bot_%d", botCounter)
				
				match.Players = append(match.Players, Player{
					UserID:   fmt.Sprintf("bot_%d", botCounter),
					UserName: botName,
					IsBot:    true,
					Status:   "joined",
				})

				if len(match.Players) >= match.MaxPlayers {
					match.Status = "active"
				}
				match.UpdatedAt = time.Now()

				log.Printf("🤖 Added bot %s to match %s", botName, match.MatchID)
			}
		}
	}
}

func processQueue() {
	queueMutex.Lock()
	defer queueMutex.Unlock()

	if len(queue) == 0 {
		return
	}

	// Group queue entries by game mode
	gameQueues := make(map[string][]QueueRequest)
	for _, req := range queue {
		gameQueues[req.GameMode] = append(gameQueues[req.GameMode], req)
	}

	// Process each game mode queue
	for gameMode, requests := range gameQueues {
		if len(requests) >= 2 {
			// Create match with first 2 players
			matchesMutex.Lock()
			matchID := fmt.Sprintf("match_%d", time.Now().UnixNano())
			match := &Match{
				MatchID:    matchID,
				Status:     "active", // Start as active since we have 2 players
				GameMode:   gameMode,
				MaxPlayers: 2,
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
				Players: []Player{
					{
						UserID:   requests[0].UserID,
						UserName: requests[0].UserName,
						IsBot:    false,
						Status:   "joined",
					},
					{
						UserID:   requests[1].UserID,
						UserName: requests[1].UserName,
						IsBot:    false,
						Status:   "joined",
					},
				},
			}
			matches[matchID] = match
			matchesMutex.Unlock()

			log.Printf("✅ Created match %s from queue with players %s and %s", 
				matchID, requests[0].UserName, requests[1].UserName)

			// Remove processed requests from queue
			remainingQueue := make([]QueueRequest, 0)
			for _, req := range queue {
				if req.GameMode != gameMode {
					remainingQueue = append(remainingQueue, req)
				} else if req.UserID != requests[0].UserID && req.UserID != requests[1].UserID {
					remainingQueue = append(remainingQueue, req)
				}
			}
			queue = remainingQueue
		}
	}
}