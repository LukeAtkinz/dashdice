package api

import (
	"encoding/json"
	"net/http"
	"time"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	response := map[string]interface{}{
		"message": "Hello from Vercel Go!",
		"time":    time.Now().Unix(),
	}

	json.NewEncoder(w).Encode(response)
}
