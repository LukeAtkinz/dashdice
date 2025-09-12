package main

import (
	"fmt"
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
		fmt.Fprintf(w, `{"message": "DashDice API Gateway is running on Railway!", "status": "healthy"}`)
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"service": "DashDice API Gateway", "status": "healthy", "message": "Go backend running on Railway! 🚂"}`)
	})

	fmt.Printf("🚂 DashDice API Gateway starting on port %s\n", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		panic(err)
	}
}
