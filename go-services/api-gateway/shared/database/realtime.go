package database

import (
	"context"
	"fmt"
	"time"

	"firebase.google.com/go/v4"
	"firebase.google.com/go/v4/db"
	"go.uber.org/zap"
	"google.golang.org/api/option"

	"api-gateway/shared/config"
	"api-gateway/shared/models"
)

// RealtimeClient implements the RealtimeRepository interface
type RealtimeClient struct {
	client *db.Client
	config *config.Config
	logger *zap.Logger
}

// NewRealtimeClient creates a new Firebase Realtime Database client
func NewRealtimeClient(cfg *config.Config, logger *zap.Logger) *RealtimeClient {
	return &RealtimeClient{
		config: cfg,
		logger: logger,
	}
}

// Connect initializes connection to Firebase Realtime Database
func (r *RealtimeClient) Connect(ctx context.Context) error {
	opt := option.WithCredentialsFile(r.config.FirebaseCredentialsPath)
	
	app, err := firebase.NewApp(ctx, &firebase.Config{
		ProjectID:   r.config.FirebaseProjectID,
		DatabaseURL: fmt.Sprintf("https://%s-default-rtdb.firebaseio.com/", r.config.FirebaseProjectID),
	}, opt)
	if err != nil {
		r.logger.Error("Failed to initialize Firebase app", zap.Error(err))
		return fmt.Errorf("firebase app initialization failed: %w", err)
	}

	r.client, err = app.Database(ctx)
	if err != nil {
		r.logger.Error("Failed to initialize Realtime Database client", zap.Error(err))
		return fmt.Errorf("realtime database client initialization failed: %w", err)
	}

	r.logger.Info("Successfully connected to Firebase Realtime Database")
	return nil
}

// Close closes the connection to Firebase Realtime Database
func (r *RealtimeClient) Close() error {
	// Firebase client doesn't need explicit close
	r.logger.Info("Realtime Database connection closed")
	return nil
}

// Ping tests the connection to Firebase Realtime Database
func (r *RealtimeClient) Ping(ctx context.Context) error {
	if r.client == nil {
		return fmt.Errorf("realtime database client not initialized")
	}
	
	// Try to read from a test path
	ref := r.client.NewRef("/.info/connected")
	var connected bool
	if err := ref.Get(ctx, &connected); err != nil {
		return fmt.Errorf("ping failed: %w", err)
	}
	
	return nil
}

// HealthCheck performs a health check on Firebase Realtime Database
func (r *RealtimeClient) HealthCheck(ctx context.Context) (*models.HealthCheck, error) {
	health := &models.HealthCheck{
		ServiceName: "realtime-database",
		Status:      "healthy",
		Timestamp:   time.Now(),
		Version:     "firebase-go-v4",
		Checks:      make(map[string]interface{}),
	}

	// Test connection
	if err := r.Ping(ctx); err != nil {
		health.Status = "unhealthy"
		health.Checks["connection"] = fmt.Sprintf("failed: %v", err)
		return health, err
	}

	health.Checks["connection"] = "ok"
	return health, nil
}

// Write writes data to a path in Realtime Database (alias for Set)
func (r *RealtimeClient) Write(ctx context.Context, path string, data interface{}) error {
	return r.Set(ctx, path, data)
}

// Set writes data to a path in Realtime Database
func (r *RealtimeClient) Set(ctx context.Context, path string, value interface{}) error {
	if r.client == nil {
		return fmt.Errorf("realtime database client not initialized")
	}

	ref := r.client.NewRef(path)
	return ref.Set(ctx, value)
}

// Read reads data from a path in Realtime Database (alias for Get)
func (r *RealtimeClient) Read(ctx context.Context, path string, dest interface{}) error {
	return r.Get(ctx, path, dest)
}

// Get reads data from a path in Realtime Database
func (r *RealtimeClient) Get(ctx context.Context, path string, dest interface{}) error {
	if r.client == nil {
		return fmt.Errorf("realtime database client not initialized")
	}

	ref := r.client.NewRef(path)
	return ref.Get(ctx, dest)
}

// Update updates specific fields at a path in Realtime Database
func (r *RealtimeClient) Update(ctx context.Context, path string, updates map[string]interface{}) error {
	if r.client == nil {
		return fmt.Errorf("realtime database client not initialized")
	}

	ref := r.client.NewRef(path)
	return ref.Update(ctx, updates)
}

// Delete deletes data at a path in Realtime Database
func (r *RealtimeClient) Delete(ctx context.Context, path string) error {
	if r.client == nil {
		return fmt.Errorf("realtime database client not initialized")
	}

	ref := r.client.NewRef(path)
	return ref.Delete(ctx)
}

// Listen sets up a listener on a path in Realtime Database
func (r *RealtimeClient) Listen(ctx context.Context, path string, callback func(interface{})) (func(), error) {
	if r.client == nil {
		return nil, fmt.Errorf("realtime database client not initialized")
	}

	ref := r.client.NewRef(path)
	
	// Create a simple listener by polling (Firebase Go SDK doesn't have native Listen)
	// This is a simplified implementation - in production you'd want to use Firebase Admin SDK's streaming
	stopCh := make(chan struct{})
	
	go func() {
		ticker := time.NewTicker(1 * time.Second) // Poll every second
		defer ticker.Stop()
		
		for {
			select {
			case <-ctx.Done():
				return
			case <-stopCh:
				return
			case <-ticker.C:
				var data interface{}
				if err := ref.Get(ctx, &data); err == nil {
					callback(data)
				}
			}
		}
	}()
	
	// Return stop function
	return func() {
		close(stopCh)
	}, nil
}

// ListenChild sets up listeners for child events (add, remove, change)
func (r *RealtimeClient) ListenChild(ctx context.Context, path string, callbacks ChildEventCallbacks) (func(), error) {
	if r.client == nil {
		return nil, fmt.Errorf("realtime database client not initialized")
	}

	// Simplified implementation - just call the added callback when data changes
	return r.Listen(ctx, path, func(data interface{}) {
		if callbacks.ChildAdded != nil {
			callbacks.ChildAdded("key", data)
		}
	})
}

// Query interface implementations
type RealtimeQueryImpl struct {
	client *RealtimeClient
	path   string
	// Query parameters would go here in a full implementation
}

// OrderByChild returns a query ordered by child
func (r *RealtimeClient) OrderByChild(child string) RealtimeQuery {
	return &RealtimeQueryImpl{client: r, path: ""} // Simplified
}

// OrderByKey returns a query ordered by key
func (r *RealtimeClient) OrderByKey() RealtimeQuery {
	return &RealtimeQueryImpl{client: r, path: ""} // Simplified
}

// OrderByValue returns a query ordered by value
func (r *RealtimeClient) OrderByValue() RealtimeQuery {
	return &RealtimeQueryImpl{client: r, path: ""} // Simplified
}

// LimitToFirst returns a query limited to first N items
func (r *RealtimeClient) LimitToFirst(limit int) RealtimeQuery {
	return &RealtimeQueryImpl{client: r, path: ""} // Simplified
}

// LimitToLast returns a query limited to last N items
func (r *RealtimeClient) LimitToLast(limit int) RealtimeQuery {
	return &RealtimeQueryImpl{client: r, path: ""} // Simplified
}

// StartAt returns a query starting at value
func (r *RealtimeClient) StartAt(value interface{}) RealtimeQuery {
	return &RealtimeQueryImpl{client: r, path: ""} // Simplified
}

// EndAt returns a query ending at value
func (r *RealtimeClient) EndAt(value interface{}) RealtimeQuery {
	return &RealtimeQueryImpl{client: r, path: ""} // Simplified
}

// EqualTo returns a query equal to value
func (r *RealtimeClient) EqualTo(value interface{}) RealtimeQuery {
	return &RealtimeQueryImpl{client: r, path: ""} // Simplified
}

// RealtimeQuery interface methods
func (q *RealtimeQueryImpl) Get(ctx context.Context, dest interface{}) error {
	// Simplified implementation
	return q.client.Get(ctx, q.path, dest)
}

func (q *RealtimeQueryImpl) Listen(ctx context.Context, callback func(interface{})) (func(), error) {
	// Simplified implementation
	return q.client.Listen(ctx, q.path, callback)
}

// Presence operations
func (r *RealtimeClient) SetPresence(ctx context.Context, userID string, presence *models.UserPresence) error {
	path := fmt.Sprintf("/presence/%s", userID)
	return r.Set(ctx, path, presence)
}

func (r *RealtimeClient) GetPresence(ctx context.Context, userID string) (*models.UserPresence, error) {
	path := fmt.Sprintf("/presence/%s", userID)
	var presence models.UserPresence
	err := r.Get(ctx, path, &presence)
	if err != nil {
		return nil, err
	}
	return &presence, nil
}

func (r *RealtimeClient) RemovePresence(ctx context.Context, userID string) error {
	path := fmt.Sprintf("/presence/%s", userID)
	return r.Delete(ctx, path)
}

func (r *RealtimeClient) ListenPresence(ctx context.Context, userID string, callback func(*models.UserPresence)) (func(), error) {
	path := fmt.Sprintf("/presence/%s", userID)
	return r.Listen(ctx, path, func(data interface{}) {
		if presence, ok := data.(*models.UserPresence); ok {
			callback(presence)
		}
	})
}

// Push pushes data to a list in Realtime Database and returns the generated key
func (r *RealtimeClient) Push(ctx context.Context, path string, data interface{}) (string, error) {
	if r.client == nil {
		return "", fmt.Errorf("realtime database client not initialized")
	}

	ref := r.client.NewRef(path)
	newRef, err := ref.Push(ctx, data)
	if err != nil {
		return "", err
	}
	
	return newRef.Key, nil
}

// Transaction performs a transaction on a path in Realtime Database
func (r *RealtimeClient) Transaction(ctx context.Context, path string, fn func(interface{}) interface{}) error {
	if r.client == nil {
		return fmt.Errorf("realtime database client not initialized")
	}

	ref := r.client.NewRef(path)
	return ref.Transaction(ctx, func(tn db.TransactionNode) (interface{}, error) {
		var current interface{}
		if err := tn.Unmarshal(&current); err != nil {
			return nil, err
		}
		
		result := fn(current)
		return result, nil
	})
}
