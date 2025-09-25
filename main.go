package mainpackage mainpackage main



// DashDice Railway Deployment Entry Point

// This serves as the main entry point for Railway deployment

// Routes to the unified backend service in /backend directory// DashDice Railway Deployment Entry Pointimport (



import (// This serves as the main entry point for Railway deployment	"encoding/json"

	"encoding/json"

	"fmt"// Routes to the unified backend service in /backend directory	"fmt"

	"log"

	"net/http"	"log"

	"os"

	"strings"import (	"net/http"

	"sync"

	"time"	"encoding/json"	"time"

)

	"fmt")

// Core data structures

type Match struct {	"log"

	MatchID    string    `json:"matchId"`

	Status     string    `json:"status"`      // waiting, active, completed	"net/http"type Player struct {

	GameMode   string    `json:"gameMode"`    // quickfire, classic, ranked

	Players    []Player  `json:"players"`	"os"	ID       string `json:"id"`

	MaxPlayers int       `json:"maxPlayers"`

	CreatedAt  time.Time `json:"createdAt"`	"strings"	Username string `json:"username"`

	UpdatedAt  time.Time `json:"updatedAt"`

}	"sync"	JoinedAt int64  `json:"joinedAt"`



type Player struct {	"time"}

	UserID   string `json:"userId"`

	UserName string `json:"userName"`)

	IsBot    bool   `json:"isBot"`

	Status   string `json:"status"` // joined, ready, disconnectedtype Match struct {

}

// Core data structures	ID      string   `json:"id"`

type MatchRequest struct {

	GameMode string `json:"gameMode"`type Match struct {	Players []Player `json:"players"`

	UserID   string `json:"userId"`

	UserName string `json:"userName"`	MatchID    string    `json:"matchId"`	Status  string   `json:"status"`

}

	Status     string    `json:"status"`      // waiting, active, completed	Created int64    `json:"created"`

type QueueRequest struct {

	GameMode string `json:"gameMode"`	GameMode   string    `json:"gameMode"`    // quickfire, classic, ranked}

	UserID   string `json:"userId"`

	UserName string `json:"userName"`	Players    []Player  `json:"players"`

}

	MaxPlayers int       `json:"maxPlayers"`// Simple in-memory storage

// In-memory storage (production would use Redis/Database)

var (	CreatedAt  time.Time `json:"createdAt"`var matches = make(map[string]*Match)

	matches      = make(map[string]*Match)

	matchesMutex = sync.RWMutex{}	UpdatedAt  time.Time `json:"updatedAt"`var waitingPlayers = make([]Player, 0)

	botCounter   = 0

	queue        = make([]QueueRequest, 0)}

	queueMutex   = sync.RWMutex{}

)func enableCORS(w http.ResponseWriter) {



func main() {type Player struct {	w.Header().Set("Access-Control-Allow-Origin", "*")

	port := os.Getenv("PORT")

	if port == "" {	UserID   string `json:"userId"`	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

		port = "8080"

	}	UserName string `json:"userName"`	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")



	log.Printf("🚀 DashDice Go Backend starting on port %s", port)	IsBot    bool   `json:"isBot"`}

	log.Printf("🌍 Environment: %s", os.Getenv("ENVIRONMENT"))

	Status   string `json:"status"` // joined, ready, disconnected

	// Health check endpoint

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {}func healthHandler(w http.ResponseWriter, r *http.Request) {

		w.Header().Set("Content-Type", "application/json")

		w.Header().Set("Access-Control-Allow-Origin", "*")	enableCORS(w)

		json.NewEncoder(w).Encode(map[string]interface{}{

			"status":    "healthy",type MatchRequest struct {	

			"timestamp": time.Now(),

			"service":   "DashDice Go Backend",	GameMode string `json:"gameMode"`	response := map[string]interface{}{

			"message":   "Backend is running successfully! 🎲",

		})	UserID   string `json:"userId"`		"status":    "healthy",

	})

	UserName string `json:"userName"`		"service":   "DashDice Simple Backend",

	// CORS middleware

	corsHandler := func(next http.HandlerFunc) http.HandlerFunc {}		"version":   "v1.0-simple",

		return func(w http.ResponseWriter, r *http.Request) {

			w.Header().Set("Access-Control-Allow-Origin", "*")		"timestamp": time.Now().Unix(),

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")type QueueRequest struct {		"message":   "Simple matchmaking ready! 🎲",



			if r.Method == "OPTIONS" {	GameMode string `json:"gameMode"`	}

				w.WriteHeader(http.StatusOK)

				return	UserID   string `json:"userId"`	

			}

	UserName string `json:"userName"`	w.Header().Set("Content-Type", "application/json")

			next(w, r)

		}}	json.NewEncoder(w).Encode(response)

	}

}

	// API Routes for matchmaking

	http.HandleFunc("/api/v1/matches", corsHandler(handleMatches))// In-memory storage (production would use Redis/Database)

	http.HandleFunc("/api/v1/queue/join", corsHandler(handleQueueJoin))

	http.HandleFunc("/", corsHandler(func(w http.ResponseWriter, r *http.Request) {var (func matchesHandler(w http.ResponseWriter, r *http.Request) {

		w.Header().Set("Content-Type", "application/json")

		json.NewEncoder(w).Encode(map[string]interface{}{	matches      = make(map[string]*Match)	enableCORS(w)

			"message": "DashDice Go Backend API",

			"status":  "running",	matchesMutex = sync.RWMutex{}	

			"service": "Railway Backend",

		})	botCounter   = 0	if r.Method == "OPTIONS" {

	}))

	queue        = make([]QueueRequest, 0)		return

	// Start bot automation

	go startBotAutomation()	queueMutex   = sync.RWMutex{}	}



	log.Printf("✅ Server ready on http://localhost:%s", port))	

	log.Fatal(http.ListenAndServe(":"+port, nil))

}	if r.Method == "POST" {



func handleMatches(w http.ResponseWriter, r *http.Request) {func main() {		createMatch(w, r)

	switch r.Method {

	case "GET":	port := os.Getenv("PORT")		return

		handleGetMatches(w, r)

	case "POST":	if port == "" {	}

		handleCreateMatch(w, r)

	default:		port = "8080"	

		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)

	}	}	// GET - return all matches

}

	matchList := make([]*Match, 0)

func handleGetMatches(w http.ResponseWriter, r *http.Request) {

	status := r.URL.Query().Get("status")	log.Printf("🚀 DashDice Go Backend starting on port %s", port)	for _, match := range matches {

	gameMode := r.URL.Query().Get("game_mode")

	log.Printf("🌍 Environment: %s", os.Getenv("ENVIRONMENT"))		matchList = append(matchList, match)

	matchesMutex.RLock()

	defer matchesMutex.RUnlock()	}



	var filteredMatches []*Match	// Health check endpoint	

	for _, match := range matches {

		if status != "" && match.Status != status {	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {	w.Header().Set("Content-Type", "application/json")

			continue

		}		w.Header().Set("Content-Type", "application/json")	json.NewEncoder(w).Encode(matchList)

		if gameMode != "" && match.GameMode != gameMode {

			continue		w.Header().Set("Access-Control-Allow-Origin", "*")}

		}

		filteredMatches = append(filteredMatches, match)		json.NewEncoder(w).Encode(map[string]interface{}{

	}

			"status":    "ok",func createMatch(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(map[string]interface{}{			"timestamp": time.Now(),	var player Player

		"success": true,

		"matches": filteredMatches,			"service":   "dashdice-go-backend",	if err := json.NewDecoder(r.Body).Decode(&player); err != nil {

		"total":   len(filteredMatches),

		"status":  "success",			"version":   "1.0.0",		http.Error(w, `{"error": "Invalid player data"}`, http.StatusBadRequest)

		"message": "Go backend active",

	})		})		return

}

	})	}

func handleCreateMatch(w http.ResponseWriter, r *http.Request) {

	var req MatchRequest	

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {

		http.Error(w, "Invalid request body", http.StatusBadRequest)	// CORS middleware	player.JoinedAt = time.Now().Unix()

		return

	}	corsHandler := func(next http.HandlerFunc) http.HandlerFunc {	



	matchesMutex.Lock()		return func(w http.ResponseWriter, r *http.Request) {	log.Printf("Player %s (%s) looking for match", player.Username, player.ID)

	defer matchesMutex.Unlock()

			w.Header().Set("Access-Control-Allow-Origin", "*")	

	// Create new match

	matchID := fmt.Sprintf("match_%d", time.Now().UnixNano())			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")	// Check if there's someone waiting

	match := &Match{

		MatchID:    matchID,			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")	if len(waitingPlayers) > 0 {

		Status:     "waiting",

		GameMode:   req.GameMode,		// Match found! Create a game with the waiting player

		MaxPlayers: 2, // Default for most game modes

		CreatedAt:  time.Now(),			if r.Method == "OPTIONS" {		waitingPlayer := waitingPlayers[0]

		UpdatedAt:  time.Now(),

		Players: []Player{				w.WriteHeader(http.StatusOK)		waitingPlayers = waitingPlayers[1:] // Remove the waiting player

			{

				UserID:   req.UserID,				return		

				UserName: req.UserName,

				IsBot:    false,			}		matchID := fmt.Sprintf("match_%d", time.Now().UnixNano())

				Status:   "joined",

			},		match := &Match{

		},

	}			next(w, r)			ID:      matchID,



	matches[matchID] = match		}			Players: []Player{waitingPlayer, player},



	log.Printf("✅ Created new match: %s for user %s (%s)", matchID, req.UserName, req.GameMode)	}			Status:  "active",



	w.Header().Set("Content-Type", "application/json")			Created: time.Now().Unix(),

	json.NewEncoder(w).Encode(map[string]interface{}{

		"success": true,	// API Routes for matchmaking		}

		"matchId": matchID,

		"match":   match,	http.HandleFunc("/api/v1/matches", corsHandler(handleMatches))		

	})

}	http.HandleFunc("/api/v1/queue/join", corsHandler(handleQueueJoin))		matches[matchID] = match



func handleQueueJoin(w http.ResponseWriter, r *http.Request) {	http.HandleFunc("/", corsHandler(func(w http.ResponseWriter, r *http.Request) {		

	if r.Method != "POST" {

		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)		w.Header().Set("Content-Type", "application/json")		log.Printf("✅ Match created: %s vs %s", waitingPlayer.Username, player.Username)

		return

	}		json.NewEncoder(w).Encode(map[string]string{		



	var req QueueRequest			"message": "DashDice Go Backend API",		w.Header().Set("Content-Type", "application/json")

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {

		http.Error(w, "Invalid request body", http.StatusBadRequest)			"status":  "running",		json.NewEncoder(w).Encode(match)

		return

	}		})		return



	// Check for existing waiting matches first	}))	}

	matchesMutex.RLock()

	for _, match := range matches {	

		if match.Status == "waiting" && match.GameMode == req.GameMode && len(match.Players) < match.MaxPlayers {

			matchesMutex.RUnlock()	// Start bot automation	// No one waiting, add this player to the queue

			

			// Join existing match	go startBotAutomation()	waitingPlayers = append(waitingPlayers, player)

			matchesMutex.Lock()

			match.Players = append(match.Players, Player{	

				UserID:   req.UserID,

				UserName: req.UserName,	log.Printf("✅ Server ready on http://localhost:%s", port)	log.Printf("⏳ Player %s added to waiting queue", player.Username)

				IsBot:    false,

				Status:   "joined",	log.Fatal(http.ListenAndServe(":"+port, nil))	

			})

			}	response := map[string]interface{}{

			if len(match.Players) >= match.MaxPlayers {

				match.Status = "active"		"status":  "waiting",

			}

			match.UpdatedAt = time.Now()func handleMatches(w http.ResponseWriter, r *http.Request) {		"message": "Looking for opponent...",

			matchesMutex.Unlock()

	switch r.Method {		"player":  player,

			log.Printf("✅ User %s joined existing match: %s", req.UserName, match.MatchID)

	case "GET":	}

			w.Header().Set("Content-Type", "application/json")

			json.NewEncoder(w).Encode(map[string]interface{}{		handleGetMatches(w, r)	

				"success": true,

				"matchId": match.MatchID,	case "POST":	w.Header().Set("Content-Type", "application/json")

				"joined":  true,

				"status":  "success",		handleCreateMatch(w, r)	json.NewEncoder(w).Encode(response)

				"message": "Joined existing match",

			})	default:}

			return

		}		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)

	}

	matchesMutex.RUnlock()	}func statusHandler(w http.ResponseWriter, r *http.Request) {



	// Add to queue for new match creation}	enableCORS(w)

	queueMutex.Lock()

	queue = append(queue, req)	

	queuePosition := len(queue)

	queueMutex.Unlock()func handleGetMatches(w http.ResponseWriter, r *http.Request) {	status := map[string]interface{}{



	log.Printf("✅ User %s added to queue for %s", req.UserName, req.GameMode)	status := r.URL.Query().Get("status")		"waitingPlayers": len(waitingPlayers),



	w.Header().Set("Content-Type", "application/json")	gameMode := r.URL.Query().Get("game_mode")		"activeMatches":  len(matches),

	json.NewEncoder(w).Encode(map[string]interface{}{

		"success":       true,		"totalPlayers":   len(waitingPlayers) + (len(matches) * 2),

		"queued":        true,

		"status":        "success",	matchesMutex.RLock()	}

		"message":       "Successfully joined queue via Go backend",

		"queuePosition": queuePosition,	defer matchesMutex.RUnlock()	

		"estimatedWait": "30 seconds",

	})	w.Header().Set("Content-Type", "application/json")

}

	var filteredMatches []*Match	json.NewEncoder(w).Encode(status)

func startBotAutomation() {

	ticker := time.NewTicker(30 * time.Second)	for _, match := range matches {}

	defer ticker.Stop()

		if status != "" && match.Status != status {

	for range ticker.C {

		addBotsToWaitingMatches()			continuefunc main() {

		processQueue()

	}		}	http.HandleFunc("/health", healthHandler)

}

		if gameMode != "" && match.GameMode != gameMode {	http.HandleFunc("/matches", matchesHandler)

func addBotsToWaitingMatches() {

	matchesMutex.Lock()			continue	http.HandleFunc("/status", statusHandler)

	defer matchesMutex.Unlock()

		}	

	for _, match := range matches {

		if match.Status == "waiting" && len(match.Players) < match.MaxPlayers {		filteredMatches = append(filteredMatches, match)	port := "8080"

			// Check if match has been waiting for more than 30 seconds

			if time.Since(match.CreatedAt) > 30*time.Second {	}	log.Printf("🚀 Simple DashDice backend starting on port %s", port)

				botCounter++

				botName := fmt.Sprintf("Bot_%d", botCounter)	log.Printf("📊 Endpoints:")

				

				match.Players = append(match.Players, Player{	w.Header().Set("Content-Type", "application/json")	log.Printf("   GET  /health  - Health check")

					UserID:   fmt.Sprintf("bot_%d", botCounter),

					UserName: botName,	json.NewEncoder(w).Encode(map[string]interface{}{	log.Printf("   POST /matches - Find/create match")

					IsBot:    true,

					Status:   "joined",		"success": true,	log.Printf("   GET  /matches - List all matches")

				})

		"matches": filteredMatches,	log.Printf("   GET  /status  - System status")

				if len(match.Players) >= match.MaxPlayers {

					match.Status = "active"		"count":   len(filteredMatches),	

				}

				match.UpdatedAt = time.Now()	})	if err := http.ListenAndServe(":"+port, nil); err != nil {



				log.Printf("🤖 Added bot %s to match %s", botName, match.MatchID)}		log.Fatal("Server failed to start:", err)

			}

		}	}

	}

}func handleCreateMatch(w http.ResponseWriter, r *http.Request) {}

	var req MatchRequest

func processQueue() {	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {

	queueMutex.Lock()		http.Error(w, "Invalid request body", http.StatusBadRequest)

	defer queueMutex.Unlock()		return

	}

	if len(queue) == 0 {

		return	matchesMutex.Lock()

	}	defer matchesMutex.Unlock()



	// Group queue entries by game mode	// Create new match

	gameQueues := make(map[string][]QueueRequest)	matchID := fmt.Sprintf("match_%d", time.Now().UnixNano())

	for _, req := range queue {	match := &Match{

		gameQueues[req.GameMode] = append(gameQueues[req.GameMode], req)		MatchID:    matchID,

	}		Status:     "waiting",

		GameMode:   req.GameMode,

	// Process each game mode queue		MaxPlayers: 2, // Default for most game modes

	for gameMode, requests := range gameQueues {		CreatedAt:  time.Now(),

		if len(requests) >= 2 {		UpdatedAt:  time.Now(),

			// Create match with first 2 players		Players: []Player{

			matchesMutex.Lock()			{

			matchID := fmt.Sprintf("match_%d", time.Now().UnixNano())				UserID:   req.UserID,

			match := &Match{				UserName: req.UserName,

				MatchID:    matchID,				IsBot:    false,

				Status:     "active", // Start as active since we have 2 players				Status:   "joined",

				GameMode:   gameMode,			},

				MaxPlayers: 2,		},

				CreatedAt:  time.Now(),	}

				UpdatedAt:  time.Now(),

				Players: []Player{	matches[matchID] = match

					{

						UserID:   requests[0].UserID,	log.Printf("✅ Created new match: %s for user %s (%s)", matchID, req.UserName, req.GameMode)

						UserName: requests[0].UserName,

						IsBot:    false,	w.Header().Set("Content-Type", "application/json")

						Status:   "joined",	json.NewEncoder(w).Encode(map[string]interface{}{

					},		"success": true,

					{		"matchId": matchID,

						UserID:   requests[1].UserID,		"match":   match,

						UserName: requests[1].UserName,	})

						IsBot:    false,}

						Status:   "joined",

					},func handleQueueJoin(w http.ResponseWriter, r *http.Request) {

				},	if r.Method != "POST" {

			}		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)

			matches[matchID] = match		return

			matchesMutex.Unlock()	}



			log.Printf("✅ Created match %s from queue with players %s and %s", 	var req QueueRequest

				matchID, requests[0].UserName, requests[1].UserName)	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {

		http.Error(w, "Invalid request body", http.StatusBadRequest)

			// Remove processed requests from queue		return

			remainingQueue := make([]QueueRequest, 0)	}

			for _, req := range queue {

				if req.GameMode != gameMode {	// Check for existing waiting matches first

					remainingQueue = append(remainingQueue, req)	matchesMutex.RLock()

				} else if req.UserID != requests[0].UserID && req.UserID != requests[1].UserID {	for _, match := range matches {

					remainingQueue = append(remainingQueue, req)		if match.Status == "waiting" && match.GameMode == req.GameMode && len(match.Players) < match.MaxPlayers {

				}			matchesMutex.RUnlock()

			}			

			queue = remainingQueue			// Join existing match

		}			matchesMutex.Lock()

	}			match.Players = append(match.Players, Player{

}				UserID:   req.UserID,
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