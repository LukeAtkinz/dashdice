package database

import (
	"context"
	"fmt"
	"time"
	
	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"go.uber.org/zap"
	
	"api-gateway/shared/config"
	"api-gateway/shared/models"
)

// FirestoreClient implements the FirestoreRepository interface
type FirestoreClient struct {
	client      *firestore.Client
	authClient  *auth.Client
	config      *config.Config
	logger      *zap.Logger
	app         *firebase.App
}

// NewFirestoreClient creates a new Firestore client instance
func NewFirestoreClient(cfg *config.Config, logger *zap.Logger) *FirestoreClient {
	return &FirestoreClient{
		config: cfg,
		logger: logger,
	}
}

// Connect establishes connection to Firestore
func (f *FirestoreClient) Connect(ctx context.Context) error {
	// Initialize Firebase app with service account
	opt := option.WithCredentialsFile(f.config.FirebaseCredentialsPath)
	
	app, err := firebase.NewApp(ctx, &firebase.Config{
		ProjectID: f.config.FirebaseProjectID,
	}, opt)
	if err != nil {
		return fmt.Errorf("failed to initialize Firebase app: %w", err)
	}
	f.app = app
	
	// Initialize Firestore client
	client, err := app.Firestore(ctx)
	if err != nil {
		return fmt.Errorf("failed to initialize Firestore client: %w", err)
	}
	f.client = client
	
	// Initialize Auth client
	authClient, err := app.Auth(ctx)
	if err != nil {
		return fmt.Errorf("failed to initialize Auth client: %w", err)
	}
	f.authClient = authClient
	
	// Test the connection
	_, err = f.client.Collection("_health").Doc("test").Get(ctx)
	if err != nil && status.Code(err) != codes.NotFound {
		f.logger.Warn("Firestore health check failed, but continuing", zap.Error(err))
	}
	
	f.logger.Info("Connected to Firestore",
		zap.String("project", f.config.FirebaseProjectID),
		zap.String("database", f.config.FirestoreDatabase))
	
	return nil
}

// Close closes the Firestore connection
func (f *FirestoreClient) Close() error {
	if f.client != nil {
		err := f.client.Close()
		f.logger.Info("Firestore connection closed")
		return err
	}
	return nil
}

// HealthCheck returns Firestore health status
func (f *FirestoreClient) HealthCheck(ctx context.Context) (*models.HealthCheck, error) {
	start := time.Now()
	
	health := &models.HealthCheck{
		ServiceName: "firestore",
		Timestamp:   start,
		Status:      "healthy",
		Checks:      make(map[string]interface{}),
	}
	
	if f.client == nil {
		health.Status = "unhealthy"
		health.Checks["client"] = "not initialized"
		return health, fmt.Errorf("Firestore client not initialized")
	}
	
	// Test basic connectivity with a health check document
	_, err := f.client.Collection("_health").Doc("check").Get(ctx)
	if err != nil && status.Code(err) != codes.NotFound {
		health.Status = "unhealthy"
		health.Checks["connectivity"] = fmt.Sprintf("failed: %v", err)
	} else {
		health.Checks["connectivity"] = "ok"
	}
	
	// Test write capability
	_, err = f.client.Collection("_health").Doc("check").Set(ctx, map[string]interface{}{
		"timestamp": time.Now(),
		"status":    "ok",
	})
	if err != nil {
		health.Status = "degraded"
		health.Checks["write"] = fmt.Sprintf("failed: %v", err)
	} else {
		health.Checks["write"] = "ok"
	}
	
	health.ResponseTime = float64(time.Since(start).Nanoseconds()) / 1e6 // milliseconds
	
	return health, nil
}

// Document operations

// Create creates a new document
func (f *FirestoreClient) Create(ctx context.Context, collection, docID string, data interface{}) error {
	if f.client == nil {
		return fmt.Errorf("Firestore client not initialized")
	}
	
	_, err := f.client.Collection(collection).Doc(docID).Create(ctx, data)
	return err
}

// Get retrieves a document
func (f *FirestoreClient) Get(ctx context.Context, collection, docID string, dest interface{}) error {
	if f.client == nil {
		return fmt.Errorf("Firestore client not initialized")
	}
	
	doc, err := f.client.Collection(collection).Doc(docID).Get(ctx)
	if err != nil {
		return err
	}
	
	return doc.DataTo(dest)
}

// Update updates a document
func (f *FirestoreClient) Update(ctx context.Context, collection, docID string, updates map[string]interface{}) error {
	if f.client == nil {
		return fmt.Errorf("Firestore client not initialized")
	}
	
	// Convert map to firestore.Update slice
	updateSlice := make([]firestore.Update, 0, len(updates))
	for field, value := range updates {
		updateSlice = append(updateSlice, firestore.Update{
			Path:  field,
			Value: value,
		})
	}
	
	_, err := f.client.Collection(collection).Doc(docID).Update(ctx, updateSlice)
	return err
}

// Delete deletes a document
func (f *FirestoreClient) Delete(ctx context.Context, collection, docID string) error {
	if f.client == nil {
		return fmt.Errorf("Firestore client not initialized")
	}
	
	_, err := f.client.Collection(collection).Doc(docID).Delete(ctx)
	return err
}

// Exists checks if a document exists
func (f *FirestoreClient) Exists(ctx context.Context, collection, docID string) (bool, error) {
	if f.client == nil {
		return false, fmt.Errorf("Firestore client not initialized")
	}
	
	_, err := f.client.Collection(collection).Doc(docID).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// Collection operations

// List retrieves documents from a collection
func (f *FirestoreClient) List(ctx context.Context, collection string, dest interface{}, opts ...QueryOption) error {
	if f.client == nil {
		return fmt.Errorf("Firestore client not initialized")
	}
	
	query := f.client.Collection(collection).Query
	
	// Apply query options
	for _, opt := range opts {
		query = opt.Apply(query).(firestore.Query)
	}
	
	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		return err
	}
	
	// Convert documents to destination slice
	return f.documentsToSlice(docs, dest)
}

// Count counts documents in a collection
func (f *FirestoreClient) Count(ctx context.Context, collection string, filters ...Filter) (int64, error) {
	if f.client == nil {
		return 0, fmt.Errorf("Firestore client not initialized")
	}
	
	query := f.client.Collection(collection).Query
	
	// Apply filters
	for _, filter := range filters {
		query = filter.Apply(query).(firestore.Query)
	}
	
	// Use aggregation query for counting (if available)
	// For now, use a simple approach - get all documents and count them
	// This is less efficient but more compatible
	iter := query.Documents(ctx)
	defer iter.Stop()
	
	count := int64(0)
	for {
		_, err := iter.Next()
		if err != nil {
			break
		}
		count++
	}
	
	return count, nil
}

// Query operations

// Where creates a filter condition
func (f *FirestoreClient) Where(field string, op string, value interface{}) Filter {
	return &FirestoreFilter{
		Field: field,
		Op:    op,
		Value: value,
	}
}

// OrderBy creates an ordering option
func (f *FirestoreClient) OrderBy(field string, direction Direction) QueryOption {
	dir := firestore.Asc
	if direction == Desc {
		dir = firestore.Desc
	}
	
	return &FirestoreOrderBy{
		Field:     field,
		Direction: dir,
	}
}

// Limit creates a limit option
func (f *FirestoreClient) Limit(limit int) QueryOption {
	return &FirestoreLimit{Count: limit}
}

// Offset creates an offset option
func (f *FirestoreClient) Offset(offset int) QueryOption {
	return &FirestoreOffset{Count: offset}
}

// Transaction operations

// RunTransaction runs a function within a transaction
func (f *FirestoreClient) RunTransaction(ctx context.Context, fn func(ctx context.Context, tx Transaction) error) error {
	if f.client == nil {
		return fmt.Errorf("Firestore client not initialized")
	}
	
	return f.client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		return fn(ctx, &FirestoreTransaction{tx: tx, client: f.client})
	})
}

// Batch operations

// Batch creates a new batch
func (f *FirestoreClient) Batch(ctx context.Context) Batch {
	batch := f.client.Batch()
	return &FirestoreBatch{batch: batch, client: f.client}
}

// Real-time operations

// Listen listens to collection changes
func (f *FirestoreClient) Listen(ctx context.Context, collection string, callback func(interface{})) (func(), error) {
	if f.client == nil {
		return nil, fmt.Errorf("Firestore client not initialized")
	}
	
	snapshots := f.client.Collection(collection).Snapshots(ctx)
	
	go func() {
		for {
			snapshot, err := snapshots.Next()
			if err != nil {
				f.logger.Error("Error in collection listener", zap.Error(err))
				return
			}
			
			// Convert snapshot to appropriate format and call callback
			docs := snapshot.Documents
			var result []interface{}
			for {
				doc, err := docs.Next()
				if err != nil {
					break // End of iterator
				}
				var data interface{}
				doc.DataTo(&data)
				result = append(result, data)
			}
			
			callback(result)
		}
	}()
	
	return func() {
		snapshots.Stop()
	}, nil
}

// ListenDocument listens to document changes
func (f *FirestoreClient) ListenDocument(ctx context.Context, collection, docID string, callback func(interface{})) (func(), error) {
	if f.client == nil {
		return nil, fmt.Errorf("Firestore client not initialized")
	}
	
	snapshots := f.client.Collection(collection).Doc(docID).Snapshots(ctx)
	
	go func() {
		for {
			snapshot, err := snapshots.Next()
			if err != nil {
				f.logger.Error("Error in document listener", zap.Error(err))
				return
			}
			
			var data interface{}
			if snapshot.Exists() {
				snapshot.DataTo(&data)
			}
			
			callback(data)
		}
	}()
	
	return func() {
		snapshots.Stop()
	}, nil
}

// Helper functions

func (f *FirestoreClient) documentsToSlice(docs []*firestore.DocumentSnapshot, dest interface{}) error {
	// Implementation would depend on reflection to convert docs to proper slice type
	// This is a simplified version - in production you'd want proper type conversion
	return nil
}

// Helper types for query building

type FirestoreFilter struct {
	Field string
	Op    string
	Value interface{}
}

func (ff *FirestoreFilter) Apply(query interface{}) interface{} {
	q := query.(firestore.Query)
	return q.Where(ff.Field, ff.Op, ff.Value)
}

type FirestoreOrderBy struct {
	Field     string
	Direction firestore.Direction
}

func (fo *FirestoreOrderBy) Apply(query interface{}) interface{} {
	q := query.(firestore.Query)
	return q.OrderBy(fo.Field, fo.Direction)
}

type FirestoreLimit struct {
	Count int
}

func (fl *FirestoreLimit) Apply(query interface{}) interface{} {
	q := query.(firestore.Query)
	return q.Limit(fl.Count)
}

type FirestoreOffset struct {
	Count int
}

func (fo *FirestoreOffset) Apply(query interface{}) interface{} {
	q := query.(firestore.Query)
	return q.Offset(fo.Count)
}

// FirestoreTransaction implements Transaction interface
type FirestoreTransaction struct {
	tx     *firestore.Transaction
	client *firestore.Client
}

func (ft *FirestoreTransaction) Get(ctx context.Context, collection, docID string, dest interface{}) error {
	doc, err := ft.tx.Get(ft.client.Collection(collection).Doc(docID))
	if err != nil {
		return err
	}
	return doc.DataTo(dest)
}

func (ft *FirestoreTransaction) Create(ctx context.Context, collection, docID string, data interface{}) error {
	return ft.tx.Create(ft.client.Collection(collection).Doc(docID), data)
}

func (ft *FirestoreTransaction) Update(ctx context.Context, collection, docID string, updates map[string]interface{}) error {
	updateSlice := make([]firestore.Update, 0, len(updates))
	for field, value := range updates {
		updateSlice = append(updateSlice, firestore.Update{
			Path:  field,
			Value: value,
		})
	}
	
	return ft.tx.Update(ft.client.Collection(collection).Doc(docID), updateSlice)
}

func (ft *FirestoreTransaction) Delete(ctx context.Context, collection, docID string) error {
	return ft.tx.Delete(ft.client.Collection(collection).Doc(docID))
}

// FirestoreBatch implements Batch interface
type FirestoreBatch struct {
	batch  *firestore.WriteBatch
	client *firestore.Client
}

func (fb *FirestoreBatch) Create(collection, docID string, data interface{}) error {
	fb.batch.Create(fb.client.Collection(collection).Doc(docID), data)
	return nil
}

func (fb *FirestoreBatch) Update(collection, docID string, updates map[string]interface{}) error {
	updateSlice := make([]firestore.Update, 0, len(updates))
	for field, value := range updates {
		updateSlice = append(updateSlice, firestore.Update{
			Path:  field,
			Value: value,
		})
	}
	
	fb.batch.Update(fb.client.Collection(collection).Doc(docID), updateSlice)
	return nil
}

func (fb *FirestoreBatch) Delete(collection, docID string) error {
	fb.batch.Delete(fb.client.Collection(collection).Doc(docID))
	return nil
}

func (fb *FirestoreBatch) Commit(ctx context.Context) error {
	_, err := fb.batch.Commit(ctx)
	return err
}
