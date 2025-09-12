package database

import (
	"context"
	"fmt"
	"time"
	
	"go.uber.org/zap"
	"github.com/LukeAtkinz/dashdice/go-services/shared/config"
	"github.com/LukeAtkinz/dashdice/go-services/shared/models"
)

// DatabaseManager provides a unified interface for all database operations
type DatabaseManager interface {
	// Initialize all database connections
	Initialize(ctx context.Context) error
	
	// Close all connections
	Close() error
	
	// Get database instances
	Redis() RedisRepository
	Firestore() FirestoreRepository
	RealtimeDB() RealtimeRepository
	
	// Health checks
	HealthCheck(ctx context.Context) (map[string]*models.HealthCheck, error)
	
	// Transaction coordination across databases
	Sync(ctx context.Context, operation SyncOperation) error
	
	// Match operations
	StoreMatch(ctx context.Context, match *models.Match) error
	UpdateMatchState(ctx context.Context, matchID string, state *models.MatchState) error
	
	// User operations
	GetUser(ctx context.Context, userID string) (*models.User, error)
}

// SyncOperation defines operations that need to be coordinated across multiple databases
type SyncOperation interface {
	Execute(ctx context.Context, dbManager DatabaseManager) error
}

// RedisRepository defines operations for Redis cache/queue operations
type RedisRepository interface {
	// Connection management
	Connect(ctx context.Context) error
	Close() error
	Ping(ctx context.Context) error
	HealthCheck(ctx context.Context) (*models.HealthCheck, error)
	
	// Basic key-value operations
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error
	Get(ctx context.Context, key string) (string, error)
	GetObject(ctx context.Context, key string, dest interface{}) error
	Delete(ctx context.Context, keys ...string) error
	Exists(ctx context.Context, keys ...string) (int64, error)
	Expire(ctx context.Context, key string, expiration time.Duration) error
	TTL(ctx context.Context, key string) (time.Duration, error)
	
	// Hash operations
	HSet(ctx context.Context, key string, values ...interface{}) error
	HGet(ctx context.Context, key, field string) (string, error)
	HGetAll(ctx context.Context, key string) (map[string]string, error)
	HDel(ctx context.Context, key string, fields ...string) error
	HExists(ctx context.Context, key, field string) (bool, error)
	
	// List operations
	LPush(ctx context.Context, key string, values ...interface{}) error
	RPush(ctx context.Context, key string, values ...interface{}) error
	LPop(ctx context.Context, key string) (string, error)
	RPop(ctx context.Context, key string) (string, error)
	LLen(ctx context.Context, key string) (int64, error)
	LRange(ctx context.Context, key string, start, stop int64) ([]string, error)
	
	// Set operations
	SAdd(ctx context.Context, key string, members ...interface{}) error
	SRem(ctx context.Context, key string, members ...interface{}) error
	SMembers(ctx context.Context, key string) ([]string, error)
	SIsMember(ctx context.Context, key string, member interface{}) (bool, error)
	SCard(ctx context.Context, key string) (int64, error)
	
	// Sorted set operations
	ZAdd(ctx context.Context, key string, members ...*ZMember) error
	ZRangeWithScores(ctx context.Context, key string, start, stop int64) ([]ZMember, error)
	ZRevRangeWithScores(ctx context.Context, key string, start, stop int64) ([]ZMember, error)
	ZRem(ctx context.Context, key string, members ...interface{}) error
	ZCard(ctx context.Context, key string) (int64, error)
	ZScore(ctx context.Context, key string, member string) (float64, error)
	
	// Pub/Sub operations
	Publish(ctx context.Context, channel string, message interface{}) error
	Subscribe(ctx context.Context, channels ...string) (PubSub, error)
	
	// Transaction operations
	Multi(ctx context.Context) Pipeline
	
	// Pipeline operations
	Pipeline(ctx context.Context) Pipeline
	
	// Lua script operations
	Eval(ctx context.Context, script string, keys []string, args ...interface{}) (interface{}, error)
	EvalSha(ctx context.Context, sha1 string, keys []string, args ...interface{}) (interface{}, error)
	ScriptLoad(ctx context.Context, script string) (string, error)
}

// ZMember represents a sorted set member with score
type ZMember struct {
	Score  float64
	Member interface{}
}

// PubSub interface for Redis pub/sub operations
type PubSub interface {
	Channel() <-chan *Message
	Subscribe(ctx context.Context, channels ...string) error
	Unsubscribe(ctx context.Context, channels ...string) error
	Close() error
}

// Message represents a pub/sub message
type Message struct {
	Channel string
	Payload string
}

// Pipeline interface for Redis pipelining
type Pipeline interface {
	Set(key string, value interface{}, expiration time.Duration) error
	Get(key string) (string, error)
	Exec(ctx context.Context) error
	Discard() error
}

// FirestoreRepository defines operations for Firestore document database
type FirestoreRepository interface {
	// Connection management
	Connect(ctx context.Context) error
	Close() error
	HealthCheck(ctx context.Context) (*models.HealthCheck, error)
	
	// Document operations
	Create(ctx context.Context, collection, docID string, data interface{}) error
	Get(ctx context.Context, collection, docID string, dest interface{}) error
	Update(ctx context.Context, collection, docID string, updates map[string]interface{}) error
	Delete(ctx context.Context, collection, docID string) error
	Exists(ctx context.Context, collection, docID string) (bool, error)
	
	// Collection operations
	List(ctx context.Context, collection string, dest interface{}, opts ...QueryOption) error
	Count(ctx context.Context, collection string, filters ...Filter) (int64, error)
	
	// Query operations
	Where(field string, op string, value interface{}) Filter
	OrderBy(field string, direction Direction) QueryOption
	Limit(limit int) QueryOption
	Offset(offset int) QueryOption
	
	// Transaction operations
	RunTransaction(ctx context.Context, fn func(ctx context.Context, tx Transaction) error) error
	
	// Batch operations
	Batch(ctx context.Context) Batch
	
	// Real-time operations
	Listen(ctx context.Context, collection string, callback func(interface{})) (func(), error)
	ListenDocument(ctx context.Context, collection, docID string, callback func(interface{})) (func(), error)
}

// Filter represents a query filter
type Filter interface {
	Apply(query interface{}) interface{}
}

// QueryOption represents query configuration options
type QueryOption interface {
	Apply(query interface{}) interface{}
}

// Direction represents sort direction
type Direction int

const (
	Asc Direction = iota
	Desc
)

// Transaction interface for Firestore transactions
type Transaction interface {
	Get(ctx context.Context, collection, docID string, dest interface{}) error
	Create(ctx context.Context, collection, docID string, data interface{}) error
	Update(ctx context.Context, collection, docID string, updates map[string]interface{}) error
	Delete(ctx context.Context, collection, docID string) error
}

// Batch interface for Firestore batch operations
type Batch interface {
	Create(collection, docID string, data interface{}) error
	Update(collection, docID string, updates map[string]interface{}) error
	Delete(collection, docID string) error
	Commit(ctx context.Context) error
}

// RealtimeRepository defines operations for Firebase Realtime Database
type RealtimeRepository interface {
	// Connection management
	Connect(ctx context.Context) error
	Close() error
	HealthCheck(ctx context.Context) (*models.HealthCheck, error)
	
	// Data operations
	Set(ctx context.Context, path string, value interface{}) error
	Get(ctx context.Context, path string, dest interface{}) error
	Update(ctx context.Context, path string, updates map[string]interface{}) error
	Delete(ctx context.Context, path string) error
	Push(ctx context.Context, path string, value interface{}) (string, error)
	
	// Query operations
	OrderByChild(child string) RealtimeQuery
	OrderByKey() RealtimeQuery
	OrderByValue() RealtimeQuery
	LimitToFirst(limit int) RealtimeQuery
	LimitToLast(limit int) RealtimeQuery
	StartAt(value interface{}) RealtimeQuery
	EndAt(value interface{}) RealtimeQuery
	EqualTo(value interface{}) RealtimeQuery
	
	// Real-time listeners
	Listen(ctx context.Context, path string, callback func(interface{})) (func(), error)
	ListenChild(ctx context.Context, path string, callbacks ChildEventCallbacks) (func(), error)
	
	// Transaction operations
	Transaction(ctx context.Context, path string, fn func(interface{}) interface{}) error
	
	// Presence operations
	SetPresence(ctx context.Context, userID string, presence *models.UserPresence) error
	GetPresence(ctx context.Context, userID string) (*models.UserPresence, error)
	RemovePresence(ctx context.Context, userID string) error
	ListenPresence(ctx context.Context, userID string, callback func(*models.UserPresence)) (func(), error)
}

// RealtimeQuery interface for Realtime Database queries
type RealtimeQuery interface {
	Get(ctx context.Context, dest interface{}) error
	Listen(ctx context.Context, callback func(interface{})) (func(), error)
}

// ChildEventCallbacks represents callbacks for child events
type ChildEventCallbacks struct {
	ChildAdded    func(string, interface{})
	ChildChanged  func(string, interface{})
	ChildRemoved  func(string, interface{})
	ChildMoved    func(string, interface{})
}

// Repository interfaces for specific domain operations

// MatchRepository defines match-specific database operations
type MatchRepository interface {
	// Match CRUD operations
	CreateMatch(ctx context.Context, match *models.MatchState) error
	GetMatch(ctx context.Context, matchID string) (*models.MatchState, error)
	UpdateMatch(ctx context.Context, match *models.MatchState) error
	DeleteMatch(ctx context.Context, matchID string) error
	
	// Match queries
	GetActiveMatches(ctx context.Context, userID string) ([]*models.MatchState, error)
	GetMatchHistory(ctx context.Context, userID string, limit int) ([]*models.MatchState, error)
	GetMatchesByGameMode(ctx context.Context, gameMode string, limit int) ([]*models.MatchState, error)
	
	// Real-time match updates
	SubscribeToMatch(ctx context.Context, matchID string, callback func(*models.MatchState)) (func(), error)
	BroadcastMatchUpdate(ctx context.Context, matchID string, update *models.GameAction) error
	
	// Match statistics
	GetMatchStats(ctx context.Context, filters map[string]interface{}) (*models.MetricsData, error)
}

// QueueRepository defines queue-specific database operations
type QueueRepository interface {
	// Queue operations
	JoinQueue(ctx context.Context, player *models.QueuePlayer) error
	LeaveQueue(ctx context.Context, userID, gameMode, region string) error
	GetQueuePosition(ctx context.Context, userID, gameMode, region string) (int, error)
	UpdateHeartbeat(ctx context.Context, userID string, heartbeat *models.SessionHeartbeat) error
	
	// Queue queries
	GetQueuedPlayers(ctx context.Context, gameMode, region string, limit int) ([]*models.QueuePlayer, error)
	GetQueueStatus(ctx context.Context, gameMode, region string) (*models.QueueStatus, error)
	GetCompatiblePlayers(ctx context.Context, player *models.QueuePlayer, maxResults int) ([]*models.QueuePlayer, error)
	
	// Queue management
	CleanExpiredPlayers(ctx context.Context) (int, error)
	GetQueueMetrics(ctx context.Context, gameMode, region string) (*models.QueueMetrics, error)
}

// UserRepository defines user-specific database operations
type UserRepository interface {
	// User CRUD operations
	CreateUser(ctx context.Context, user *models.User) error
	GetUser(ctx context.Context, userID string) (*models.User, error)
	UpdateUser(ctx context.Context, user *models.User) error
	DeleteUser(ctx context.Context, userID string) error
	
	// User queries
	FindUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUsersByIDs(ctx context.Context, userIDs []string) ([]*models.User, error)
	SearchUsers(ctx context.Context, query string, limit int) ([]*models.User, error)
	
	// User statistics
	UpdateUserStats(ctx context.Context, userID string, stats *models.PlayerStats) error
	GetLeaderboard(ctx context.Context, gameMode string, limit int) ([]*models.User, error)
	
	// User preferences
	UpdatePreferences(ctx context.Context, userID string, preferences *models.UserPreferences) error
}

// SessionRepository defines session-specific database operations
type SessionRepository interface {
	// Session operations
	CreateSession(ctx context.Context, session *models.GameSession) error
	GetSession(ctx context.Context, sessionID string) (*models.GameSession, error)
	UpdateSession(ctx context.Context, session *models.GameSession) error
	DeleteSession(ctx context.Context, sessionID string) error
	
	// Session queries
	GetActiveSessionsByUser(ctx context.Context, userID string) ([]*models.GameSession, error)
	GetSessionsByRegion(ctx context.Context, region string) ([]*models.GameSession, error)
	CleanupExpiredSessions(ctx context.Context) (int, error)
	
	// Heartbeat operations
	UpdateHeartbeat(ctx context.Context, sessionID string, heartbeat *models.SessionHeartbeat) error
	GetStaleConnections(ctx context.Context, timeout time.Duration) ([]*models.GameSession, error)
	
	// Presence operations
	SetPresence(ctx context.Context, userID string, presence *models.UserPresence) error
	GetPresence(ctx context.Context, userID string) (*models.UserPresence, error)
	GetOnlineUsers(ctx context.Context, limit int) ([]*models.UserPresence, error)
	SubscribeToPresence(ctx context.Context, userID string, callback func(*models.UserPresence)) (func(), error)
}

// DatabaseManagerImpl implements the DatabaseManager interface
type DatabaseManagerImpl struct {
	redis     *RedisClient
	firestore *FirestoreClient
	realtime  *RealtimeClient
	config    *config.Config
	logger    *zap.Logger
}

// NewDatabaseManager creates a new database manager with all database clients
func NewDatabaseManager(cfg *config.Config, logger *zap.Logger) DatabaseManager {
	return &DatabaseManagerImpl{
		redis:     NewRedisClient(cfg, logger),
		firestore: NewFirestoreClient(cfg, logger),
		realtime:  NewRealtimeClient(cfg, logger),
		config:    cfg,
		logger:    logger,
	}
}

// Initialize initializes all database connections
func (dm *DatabaseManagerImpl) Initialize(ctx context.Context) error {
	// Initialize Redis connection if enabled
	if dm.config.UseRedis {
		if err := dm.redis.Connect(ctx); err != nil {
			dm.logger.Error("Failed to connect to Redis", zap.Error(err))
			return fmt.Errorf("redis connection failed: %w", err)
		}
	}

	// Initialize Firestore connection if enabled
	if dm.config.UseFirestore {
		if err := dm.firestore.Connect(ctx); err != nil {
			dm.logger.Error("Failed to connect to Firestore", zap.Error(err))
			return fmt.Errorf("firestore connection failed: %w", err)
		}
	}

	// Initialize Realtime Database connection if enabled
	if dm.config.UseRealtimeDB {
		if err := dm.realtime.Connect(ctx); err != nil {
			dm.logger.Error("Failed to connect to Realtime Database", zap.Error(err))
			return fmt.Errorf("realtime database connection failed: %w", err)
		}
	}

	dm.logger.Info("All database connections initialized successfully")
	return nil
}

// Close closes all database connections
func (dm *DatabaseManagerImpl) Close() error {
	var errs []error

	if err := dm.redis.Close(); err != nil {
		errs = append(errs, fmt.Errorf("redis close error: %w", err))
	}

	if err := dm.firestore.Close(); err != nil {
		errs = append(errs, fmt.Errorf("firestore close error: %w", err))
	}

	if err := dm.realtime.Close(); err != nil {
		errs = append(errs, fmt.Errorf("realtime close error: %w", err))
	}

	if len(errs) > 0 {
		return fmt.Errorf("database close errors: %v", errs)
	}

	dm.logger.Info("All database connections closed successfully")
	return nil
}

// Redis returns the Redis repository
func (dm *DatabaseManagerImpl) Redis() RedisRepository {
	return dm.redis
}

// Firestore returns the Firestore repository
func (dm *DatabaseManagerImpl) Firestore() FirestoreRepository {
	return dm.firestore
}

// RealtimeDB returns the Realtime Database repository
func (dm *DatabaseManagerImpl) RealtimeDB() RealtimeRepository {
	return dm.realtime
}

// HealthCheck performs health checks on all databases
func (dm *DatabaseManagerImpl) HealthCheck(ctx context.Context) (map[string]*models.HealthCheck, error) {
	results := make(map[string]*models.HealthCheck)

	// Redis health check
	if redisHealth, err := dm.redis.HealthCheck(ctx); err != nil {
		results["redis"] = &models.HealthCheck{
			ServiceName: "redis",
			Status:      "unhealthy",
			Timestamp:   time.Now(),
		}
	} else {
		results["redis"] = redisHealth
	}

	// Firestore health check
	if firestoreHealth, err := dm.firestore.HealthCheck(ctx); err != nil {
		results["firestore"] = &models.HealthCheck{
			ServiceName: "firestore",
			Status:      "unhealthy", 
			Timestamp:   time.Now(),
		}
	} else {
		results["firestore"] = firestoreHealth
	}

	// Realtime DB health check
	if realtimeHealth, err := dm.realtime.HealthCheck(ctx); err != nil {
		results["realtime"] = &models.HealthCheck{
			ServiceName: "realtime",
			Status:      "unhealthy",
			Timestamp:   time.Now(),
		}
	} else {
		results["realtime"] = realtimeHealth
	}

	return results, nil
}

// Sync performs cross-database synchronization operations
func (dm *DatabaseManagerImpl) Sync(ctx context.Context, operation SyncOperation) error {
	// Execute the operation
	if err := operation.Execute(ctx, dm); err != nil {
		dm.logger.Error("Sync operation failed", zap.Error(err))
		return fmt.Errorf("sync operation failed: %w", err)
	}

	return nil
}

// StoreMatch stores a match record in Firestore
func (dm *DatabaseManagerImpl) StoreMatch(ctx context.Context, match *models.Match) error {
	if err := dm.firestore.Create(ctx, "matches", match.ID, match); err != nil {
		return fmt.Errorf("failed to store match: %w", err)
	}
	return nil
}

// UpdateMatchState updates match state in Redis
func (dm *DatabaseManagerImpl) UpdateMatchState(ctx context.Context, matchID string, state *models.MatchState) error {
	key := fmt.Sprintf("match_state:%s", matchID)
	if err := dm.redis.Set(ctx, key, state, time.Hour); err != nil {
		return fmt.Errorf("failed to update match state: %w", err)
	}
	return nil
}

// GetUser retrieves a user from Firestore
func (dm *DatabaseManagerImpl) GetUser(ctx context.Context, userID string) (*models.User, error) {
	var user models.User
	if err := dm.firestore.Get(ctx, "users", userID, &user); err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}
