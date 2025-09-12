package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"message": "DashDice API is live on Railway!", "status": "healthy", "timestamp": %d}`, 1726145000)
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"service": "DashDice API", "status": "healthy", "message": "Railway deployment successful!"}`)
	})

	log.Printf("Starting DashDice API on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
