package handler

import (
	"encoding/json"
	"net/http"
)

type QueueResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
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

	if r.Method != "DELETE" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// TODO: Implement queue leave logic
	response := QueueResponse{
		Success: true,
		Message: "Successfully left matchmaking queue",
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
