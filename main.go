package main

// DASHDICE UNIFIED BACKEND WITH FIREBASE PERSISTENCE
// Replaces: backend-simple, go-services, api-gateway, complex proxy routing
// Provides: Match creation, player matching, bot integration, persistent storage

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"
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
	UserID   string `json:"userId"`
	UserName string `json:"userName"`
	GameMode string `json:"gameMode"`
}

// Global variables
var (
	firestoreClient *firestore.Client
	ctx             context.Context
	botCounter      = 0
	counterMutex    sync.Mutex
)

const (
	MATCHES_COLLECTION = "matches"
	BOT_CHECK_INTERVAL = 5 * time.Second
	BOT_JOIN_DELAY     = 10 * time.Second
)

func main() {
	// Initialize Firebase
	if err := initFirebase(); err != nil {
		log.Fatalf("❌ Failed to initialize Firebase: %v", err)
	}

	// Start bot matching service
	go startBotMatchingService()

	// Setup HTTP routes
	http.HandleFunc("/health", handleHealth)
	http.HandleFunc("/api/v1/matches", handleMatches)
	http.HandleFunc("/api/v1/matches/", handleMatchByID)
	http.HandleFunc("/api/v1/queue/join", handleQueueJoin)
	http.HandleFunc("/api/v1/queue/status", handleQueueStatus)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 DashDice Unified Backend with Firebase starting on port %s", port)
	log.Printf("🔥 Features: Match creation, Player matching, Bot integration, Persistent storage")
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// Initialize Firebase Admin SDK
func initFirebase() error {
	ctx = context.Background()

	// Get Firebase credentials from environment
	projectID := os.Getenv("FIREBASE_PROJECT_ID")
	clientEmail := os.Getenv("FIREBASE_CLIENT_EMAIL")
	privateKey := os.Getenv("FIREBASE_PRIVATE_KEY")

	if projectID == "" || clientEmail == "" || privateKey == "" {
		return fmt.Errorf("missing Firebase credentials in environment variables")
	}

	// Replace escaped newlines in private key
	privateKey = strings.ReplaceAll(privateKey, "\\n", "\n")

	// Create service account credentials
	credentialsJSON := fmt.Sprintf(`{
		"type": "service_account",
		"project_id": "%s",
		"client_email": "%s",
		"private_key": "%s"
	}`, projectID, clientEmail, privateKey)

	// Initialize Firebase app
	opt := option.WithCredentialsJSON([]byte(credentialsJSON))
	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		return fmt.Errorf("error initializing Firebase app: %v", err)
	}

	// Initialize Firestore client
	firestoreClient, err = app.Firestore(ctx)
	if err != nil {
		return fmt.Errorf("error initializing Firestore client: %v", err)
	}

	log.Printf("✅ Firebase initialized successfully - Project: %s", projectID)
	return nil
}

// Health check endpoint
func handleHealth(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	response := map[string]interface{}{
		"status":     "healthy",
		"service":    "DashDice Unified Backend with Firebase",
		"message":    "All matchmaking services operational! 🎲",
		"version":    "v4.0-firebase",
		"timestamp":  time.Now().Unix(),
		"features": []string{
			"Match Creation",
			"Player Matching", 
			"Bot Integration",
			"Persistent Storage",
			"Firebase Firestore",
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

// List matches with filtering from Firestore
func handleListMatches(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	gameMode := r.URL.Query().Get("gameMode")
	
	query := firestoreClient.Collection(MATCHES_COLLECTION).Query
	
	// Apply filters
	if status != "" {
		query = query.Where("status", "==", status)
	}
	if gameMode != "" {
		query = query.Where("gameMode", "==", gameMode)
	}
	
	// Execute query
	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		log.Printf("❌ Error querying matches: %v", err)
		http.Error(w, `{"error": "Failed to query matches"}`, http.StatusInternalServerError)
		return
	}
	
	var matches []Match
	for _, doc := range docs {
		var match Match
		if err := doc.DataTo(&match); err != nil {
			log.Printf("⚠️ Error parsing match document: %v", err)
			continue
		}
		matches = append(matches, match)
	}
	
	response := map[string]interface{}{
		"success": true,
		"matches": matches,
		"total":   len(matches),
		"message": fmt.Sprintf("Found %d matches", len(matches)),
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Create new match with Firestore persistence
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
	query := firestoreClient.Collection(MATCHES_COLLECTION).
		Where("status", "==", "waiting").
		Where("gameMode", "==", req.GameMode).
		Limit(1)
	
	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		log.Printf("❌ Error querying waiting matches: %v", err)
	}
	
	// If found waiting match, try to join it
	if len(docs) > 0 {
		doc := docs[0]
		var existingMatch Match
		if err := doc.DataTo(&existingMatch); err == nil {
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
			
			// Add player to existing match if not full
			if len(existingMatch.Players) < existingMatch.MaxPlayers {
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
				
				// Update in Firestore
				_, err := doc.Ref.Set(ctx, existingMatch)
				if err != nil {
					log.Printf("❌ Error updating match: %v", err)
				} else {
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
		}
	}
	
	// Create new match
	matchID := fmt.Sprintf("match_%d_%s", time.Now().Unix(), req.UserID[:8])
	newMatch := Match{
		MatchID:    matchID,
		Status:     "waiting",
		GameMode:   req.GameMode,
		Players: []Player{{
			UserID:   req.UserID,
			UserName: req.UserName,
			IsBot:    false,
			Status:   "joined",
		}},
		MaxPlayers: 2,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
	
	// Save to Firestore
	_, err = firestoreClient.Collection(MATCHES_COLLECTION).Doc(matchID).Set(ctx, newMatch)
	if err != nil {
		log.Printf("❌ Error creating match: %v", err)
		http.Error(w, `{"error": "Failed to create match"}`, http.StatusInternalServerError)
		return
	}
	
	log.Printf("🆕 New match created: %s for player %s (mode: %s)", 
		matchID, req.UserID, req.GameMode)
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"created": true,
		"match":   newMatch,
		"message": "New match created",
	})
}

// Handle individual match by ID
func handleMatchByID(w http.ResponseWriter, r *http.Request) {
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
	
	if r.Method == "GET" {
		handleGetMatch(w, matchID)
	} else if r.Method == "PUT" {
		handleUpdateMatch(w, r, matchID)
	} else {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

// Get specific match from Firestore
func handleGetMatch(w http.ResponseWriter, matchID string) {
	doc, err := firestoreClient.Collection(MATCHES_COLLECTION).Doc(matchID).Get(ctx)
	if err != nil {
		log.Printf("❌ Error getting match %s: %v", matchID, err)
		http.Error(w, fmt.Sprintf(`{"error": "Match not found", "matchId": "%s"}`, matchID), http.StatusNotFound)
		return
	}
	
	var match Match
	if err := doc.DataTo(&match); err != nil {
		log.Printf("❌ Error parsing match %s: %v", matchID, err)
		http.Error(w, `{"error": "Failed to parse match"}`, http.StatusInternalServerError)
		return
	}
	
	response := map[string]interface{}{
		"success": true,
		"match":   match,
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Update match (for join/leave/ready actions)
func handleUpdateMatch(w http.ResponseWriter, r *http.Request, matchID string) {
	// Implementation for match updates...
	http.Error(w, `{"error": "Match updates not implemented yet"}`, http.StatusNotImplemented)
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
	
	// Simulate queue response
	response := map[string]interface{}{
		"status":          "success",
		"message":         "Successfully joined queue via Firebase backend",
		"queuePosition":   1,
		"estimatedWait":   "30 seconds",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Queue status
func handleQueueStatus(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	// Get waiting matches count from Firestore
	query := firestoreClient.Collection(MATCHES_COLLECTION).Where("status", "==", "waiting")
	docs, err := query.Documents(ctx).GetAll()
	waitingMatches := 0
	if err == nil {
		waitingMatches = len(docs)
	}
	
	// Get active matches count from Firestore
	query = firestoreClient.Collection(MATCHES_COLLECTION).Where("status", "==", "active")
	docs, err = query.Documents(ctx).GetAll()
	activeMatches := 0
	if err == nil {
		activeMatches = len(docs)
	}
	
	response := map[string]interface{}{
		"status":         "healthy",
		"waitingMatches": waitingMatches,
		"activeMatches":  activeMatches,
		"message":        "Queue system operational",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Bot matching service - runs in background with Firestore
func startBotMatchingService() {
	log.Printf("🤖 Bot matching service started with Firebase persistence")
	
	ticker := time.NewTicker(BOT_CHECK_INTERVAL)
	defer ticker.Stop()
	
	for range ticker.C {
		addBotsToWaitingMatches()
	}
}

func addBotsToWaitingMatches() {
	// Query waiting matches from Firestore
	query := firestoreClient.Collection(MATCHES_COLLECTION).Where("status", "==", "waiting")
	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		log.Printf("❌ Error querying waiting matches for bots: %v", err)
		return
	}
	
	for _, doc := range docs {
		var match Match
		if err := doc.DataTo(&match); err != nil {
			continue
		}
		
		// Check if match needs a bot and has been waiting long enough
		if len(match.Players) < match.MaxPlayers && 
		   time.Since(match.CreatedAt) > BOT_JOIN_DELAY {
			
			counterMutex.Lock()
			botCounter++
			botName := fmt.Sprintf("DashBot_%d", botCounter)
			botID := fmt.Sprintf("bot_%d", botCounter)
			counterMutex.Unlock()
			
			// Add bot to match
			match.Players = append(match.Players, Player{
				UserID:   botID,
				UserName: botName,
				IsBot:    true,
				Status:   "ready",
			})
			
			// Start match if full
			if len(match.Players) >= match.MaxPlayers {
				match.Status = "active"
			}
			
			match.UpdatedAt = time.Now()
			
			// Update in Firestore
			_, err := doc.Ref.Set(ctx, match)
			if err != nil {
				log.Printf("❌ Error adding bot to match %s: %v", match.MatchID, err)
			} else {
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