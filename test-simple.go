package main

import (
    "fmt"
    "net/http"
)

func main() {
    fmt.Println("Starting test server on port 8080...")
    
    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Content-Type", "application/json")
        fmt.Fprintf(w, `{"status": "healthy", "message": "Test Go server working!"}`)
    })
    
    fmt.Println("Server listening on http://localhost:8080")
    err := http.ListenAndServe(":8080", nil)
    if err != nil {
        fmt.Printf("Error starting server: %v\n", err)
    }
}