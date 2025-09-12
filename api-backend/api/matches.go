package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

type Match struct {
	ID          string            `json:"id"`
	Status      string            `json:"status"`
	GameMode    string            `json:"game_mode"`
	MaxPlayers  int               `json:"max_players"`
	Players     []string          `json:"players"`
	CreatedAt   int64             `json:"created_at"`
	StartedAt   *int64            `json:"started_at,omitempty"`
	EndedAt     *int64            `json:"ended_at,omitempty"`
	Winner      *string           `json:"winner,omitempty"`
	Scores      map[string]int    `json:"scores,omitempty"`
}

type MatchesResponse struct {
	Matches []Match `json:"matches"`
	Total   int     `json:"total"`
}

type CreateMatchRequest struct {
	GameMode   string                 `json:"game_mode"`
	MaxPlayers int                    `json:"max_players,omitempty"`
	IsPrivate  bool                   `json:"is_private,omitempty"`
	Settings   map[string]interface{} `json:"settings,omitempty"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Content-Type", "application/json")
	
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	switch r.Method {
	case "GET":
		handleGetMatches(w, r)
	case "POST":
		handleCreateMatch(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleGetMatches(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	status := r.URL.Query().Get("status")
	limitStr := r.URL.Query().Get("limit")
	gameMode := r.URL.Query().Get("game_mode")

	limit := 10 // default
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil {
			limit = parsedLimit
		}
	}

	// For now, return mock data
	// TODO: Replace with actual database queries
	matches := []Match{}
	
	// Mock active match for testing
	if status == "active" {
		matches = append(matches, Match{
			ID:         "match_" + strconv.FormatInt(time.Now().Unix(), 10),
			Status:     "active",
			GameMode:   gameMode,
			MaxPlayers: 2,
			Players:    []string{"player1", "player2"},
			CreatedAt:  time.Now().Unix(),
		})
	}

	response := MatchesResponse{
		Matches: matches[:min(len(matches), limit)],
		Total:   len(matches),
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func handleCreateMatch(w http.ResponseWriter, r *http.Request) {
	var req CreateMatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Create new match
	// TODO: Replace with actual database operations
	newMatch := Match{
		ID:         "match_" + strconv.FormatInt(time.Now().Unix(), 10),
		Status:     "waiting",
		GameMode:   req.GameMode,
		MaxPlayers: req.MaxPlayers,
		Players:    []string{},
		CreatedAt:  time.Now().Unix(),
	}

	if req.MaxPlayers == 0 {
		newMatch.MaxPlayers = 2 // default
	}

	response := map[string]interface{}{
		"match": newMatch,
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
