package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Content-Type", "application/json")

	// Handle preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	response := map[string]interface{}{
		"service":   "DashDice API Gateway",
		"status":    "healthy",
		"timestamp": time.Now().Unix(),
		"version":   "1.0.0",
		"message":   "Go backend is running on Vercel!",
	}

	jsonResponse, err := json.Marshal(response)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error creating response: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(jsonResponse)
}
