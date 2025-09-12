package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

type QueueEntry struct {
	UserID         string `json:"user_id"`
	GameMode       string `json:"game_mode"`
	JoinedAt       int64  `json:"joined_at"`
	EstimatedWait  string `json:"estimated_wait"`
	QueuePosition  int    `json:"queue_position"`
	Preference     string `json:"preference"`
}

type JoinQueueRequest struct {
	GameMode    string                 `json:"game_mode"`
	SkillLevel  int                   `json:"skill_level,omitempty"`
	Preferences map[string]interface{} `json:"preferences,omitempty"`
}

type QueueResponse struct {
	Success      bool        `json:"success"`
	Message      string      `json:"message"`
	QueueEntry   *QueueEntry `json:"queue_entry,omitempty"`
}

func Queue(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Content-Type", "application/json")
	
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Extract path to determine action
	path := r.URL.Path
	
	switch {
	case path == "/api/v1/queue/join" && r.Method == "POST":
		handleJoinQueue(w, r)
	case path == "/api/v1/queue/leave" && r.Method == "DELETE":
		handleLeaveQueue(w, r)
	case path == "/api/v1/queue/status" && r.Method == "GET":
		handleQueueStatus(w, r)
	default:
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

func handleJoinQueue(w http.ResponseWriter, r *http.Request) {
	var req JoinQueueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Extract user ID from preferences (mock implementation)
	userID := "unknown_user"
	if prefs, ok := req.Preferences["userId"].(string); ok {
		userID = prefs
	}

	// Create queue entry
	// TODO: Replace with actual queue management
	queueEntry := QueueEntry{
		UserID:        userID,
		GameMode:      req.GameMode,
		JoinedAt:      time.Now().Unix(),
		EstimatedWait: "2-3 minutes",
		QueuePosition: 3, // mock position
		Preference:    "",
	}

	response := QueueResponse{
		Success:    true,
		Message:    "Successfully joined matchmaking queue",
		QueueEntry: &queueEntry,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func handleLeaveQueue(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement queue leave logic
	response := QueueResponse{
		Success: true,
		Message: "Successfully left matchmaking queue",
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func handleQueueStatus(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement queue status logic
	response := map[string]interface{}{
		"in_queue": false,
		"position": 0,
		"estimated_wait": "0 minutes",
		"total_waiting": 0,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
