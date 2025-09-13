package database

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"time"
	
	"github.com/go-redis/redis/v8"
	"api-gateway/shared/config"
	"api-gateway/shared/models"
	"go.uber.org/zap"
)

// RedisClient implements the RedisRepository interface
type RedisClient struct {
	client *redis.Client
	config *config.Config
	logger *zap.Logger
}

// NewRedisClient creates a new Redis client instance
func NewRedisClient(cfg *config.Config, logger *zap.Logger) *RedisClient {
	return &RedisClient{
		config: cfg,
		logger: logger,
	}
}

// Connect establishes connection to Redis
func (r *RedisClient) Connect(ctx context.Context) error {
	options := &redis.Options{
		Addr:         r.config.GetRedisAddr(),
		Password:     r.config.RedisPassword,
		DB:           r.config.RedisDB,
		PoolSize:     r.config.MaxConnections,
		MinIdleConns: 10,
		MaxRetries:   3,
		DialTimeout:  time.Duration(r.config.ConnectionTimeout) * time.Second,
		ReadTimeout:  time.Duration(r.config.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(r.config.WriteTimeout) * time.Second,
		IdleTimeout:  5 * time.Minute,
	}
	
	// Enable TLS if configured
	if r.config.RedisTLS {
		options.TLSConfig = &tls.Config{
			ServerName: r.config.RedisHost,
		}
	}
	
	r.client = redis.NewClient(options)
	
	// Test the connection
	err := r.Ping(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}
	
	r.logger.Info("Connected to Redis",
		zap.String("addr", r.config.GetRedisAddr()),
		zap.Int("db", r.config.RedisDB))
	
	return nil
}

// Close closes the Redis connection
func (r *RedisClient) Close() error {
	if r.client != nil {
		err := r.client.Close()
		r.logger.Info("Redis connection closed")
		return err
	}
	return nil
}

// Ping tests the Redis connection
func (r *RedisClient) Ping(ctx context.Context) error {
	if r.client == nil {
		return fmt.Errorf("Redis client not initialized")
	}
	
	return r.client.Ping(ctx).Err()
}

// HealthCheck returns Redis health status
func (r *RedisClient) HealthCheck(ctx context.Context) (*models.HealthCheck, error) {
	start := time.Now()
	
	health := &models.HealthCheck{
		ServiceName: "redis",
		Timestamp:   start,
		Status:      "healthy",
		Checks:      make(map[string]interface{}),
	}
	
	// Test basic connectivity
	err := r.Ping(ctx)
	if err != nil {
		health.Status = "unhealthy"
		health.Checks["ping"] = fmt.Sprintf("failed: %v", err)
		return health, err
	}
	health.Checks["ping"] = "ok"
	
	// Get Redis info
	info := r.client.Info(ctx, "server", "memory", "stats")
	if info.Err() != nil {
		health.Status = "degraded"
		health.Checks["info"] = fmt.Sprintf("failed: %v", info.Err())
	} else {
		health.Checks["info"] = "ok"
	}
	
	// Check memory usage
	memInfo := r.client.Info(ctx, "memory")
	if memInfo.Err() == nil {
		health.Checks["memory"] = "ok"
	}
	
	// Check connection pool
	stats := r.client.PoolStats()
	health.Checks["pool_stats"] = map[string]interface{}{
		"hits":        stats.Hits,
		"misses":      stats.Misses,
		"timeouts":    stats.Timeouts,
		"total_conns": stats.TotalConns,
		"idle_conns":  stats.IdleConns,
		"stale_conns": stats.StaleConns,
	}
	
	health.ResponseTime = float64(time.Since(start).Nanoseconds()) / 1e6 // milliseconds
	
	return health, nil
}

// Basic key-value operations

// Set stores a key-value pair with expiration
func (r *RedisClient) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	return r.client.Set(ctx, key, value, expiration).Err()
}

// Get retrieves a value by key
func (r *RedisClient) Get(ctx context.Context, key string) (string, error) {
	return r.client.Get(ctx, key).Result()
}

// GetObject retrieves and unmarshals a JSON object
func (r *RedisClient) GetObject(ctx context.Context, key string, dest interface{}) error {
	data, err := r.client.Get(ctx, key).Result()
	if err != nil {
		return err
	}
	
	return json.Unmarshal([]byte(data), dest)
}

// Delete removes one or more keys
func (r *RedisClient) Delete(ctx context.Context, keys ...string) error {
	return r.client.Del(ctx, keys...).Err()
}

// Exists checks if keys exist
func (r *RedisClient) Exists(ctx context.Context, keys ...string) (int64, error) {
	return r.client.Exists(ctx, keys...).Result()
}

// Expire sets expiration for a key
func (r *RedisClient) Expire(ctx context.Context, key string, expiration time.Duration) error {
	return r.client.Expire(ctx, key, expiration).Err()
}

// TTL returns time to live for a key
func (r *RedisClient) TTL(ctx context.Context, key string) (time.Duration, error) {
	return r.client.TTL(ctx, key).Result()
}

// Hash operations

// HSet sets hash field values
func (r *RedisClient) HSet(ctx context.Context, key string, values ...interface{}) error {
	return r.client.HSet(ctx, key, values...).Err()
}

// HGet gets hash field value
func (r *RedisClient) HGet(ctx context.Context, key, field string) (string, error) {
	return r.client.HGet(ctx, key, field).Result()
}

// HGetAll gets all hash fields and values
func (r *RedisClient) HGetAll(ctx context.Context, key string) (map[string]string, error) {
	return r.client.HGetAll(ctx, key).Result()
}

// HDel deletes hash fields
func (r *RedisClient) HDel(ctx context.Context, key string, fields ...string) error {
	return r.client.HDel(ctx, key, fields...).Err()
}

// HExists checks if hash field exists
func (r *RedisClient) HExists(ctx context.Context, key, field string) (bool, error) {
	return r.client.HExists(ctx, key, field).Result()
}

// List operations

// LPush prepends values to list
func (r *RedisClient) LPush(ctx context.Context, key string, values ...interface{}) error {
	return r.client.LPush(ctx, key, values...).Err()
}

// RPush appends values to list
func (r *RedisClient) RPush(ctx context.Context, key string, values ...interface{}) error {
	return r.client.RPush(ctx, key, values...).Err()
}

// LPop removes and returns first list element
func (r *RedisClient) LPop(ctx context.Context, key string) (string, error) {
	return r.client.LPop(ctx, key).Result()
}

// RPop removes and returns last list element
func (r *RedisClient) RPop(ctx context.Context, key string) (string, error) {
	return r.client.RPop(ctx, key).Result()
}

// LLen returns list length
func (r *RedisClient) LLen(ctx context.Context, key string) (int64, error) {
	return r.client.LLen(ctx, key).Result()
}

// LRange returns list elements in range
func (r *RedisClient) LRange(ctx context.Context, key string, start, stop int64) ([]string, error) {
	return r.client.LRange(ctx, key, start, stop).Result()
}

// Set operations

// SAdd adds members to set
func (r *RedisClient) SAdd(ctx context.Context, key string, members ...interface{}) error {
	return r.client.SAdd(ctx, key, members...).Err()
}

// SRem removes members from set
func (r *RedisClient) SRem(ctx context.Context, key string, members ...interface{}) error {
	return r.client.SRem(ctx, key, members...).Err()
}

// SMembers returns all set members
func (r *RedisClient) SMembers(ctx context.Context, key string) ([]string, error) {
	return r.client.SMembers(ctx, key).Result()
}

// SIsMember checks if member exists in set
func (r *RedisClient) SIsMember(ctx context.Context, key string, member interface{}) (bool, error) {
	return r.client.SIsMember(ctx, key, member).Result()
}

// SCard returns set cardinality
func (r *RedisClient) SCard(ctx context.Context, key string) (int64, error) {
	return r.client.SCard(ctx, key).Result()
}

// Sorted set operations

// ZAdd adds members to sorted set
func (r *RedisClient) ZAdd(ctx context.Context, key string, members ...*ZMember) error {
	zMembers := make([]*redis.Z, len(members))
	for i, m := range members {
		zMembers[i] = &redis.Z{Score: m.Score, Member: m.Member}
	}
	return r.client.ZAdd(ctx, key, zMembers...).Err()
}

// ZRangeWithScores returns sorted set members with scores in range
func (r *RedisClient) ZRangeWithScores(ctx context.Context, key string, start, stop int64) ([]ZMember, error) {
	result, err := r.client.ZRangeWithScores(ctx, key, start, stop).Result()
	if err != nil {
		return nil, err
	}
	
	members := make([]ZMember, len(result))
	for i, z := range result {
		members[i] = ZMember{Score: z.Score, Member: z.Member}
	}
	return members, nil
}

// ZRevRangeWithScores returns sorted set members with scores in reverse range
func (r *RedisClient) ZRevRangeWithScores(ctx context.Context, key string, start, stop int64) ([]ZMember, error) {
	result, err := r.client.ZRevRangeWithScores(ctx, key, start, stop).Result()
	if err != nil {
		return nil, err
	}
	
	members := make([]ZMember, len(result))
	for i, z := range result {
		members[i] = ZMember{Score: z.Score, Member: z.Member}
	}
	return members, nil
}

// ZRem removes members from sorted set
func (r *RedisClient) ZRem(ctx context.Context, key string, members ...interface{}) error {
	return r.client.ZRem(ctx, key, members...).Err()
}

// ZCard returns sorted set cardinality
func (r *RedisClient) ZCard(ctx context.Context, key string) (int64, error) {
	return r.client.ZCard(ctx, key).Result()
}

// ZScore returns member score in sorted set
func (r *RedisClient) ZScore(ctx context.Context, key string, member string) (float64, error) {
	return r.client.ZScore(ctx, key, member).Result()
}

// Pub/Sub operations

// Publish publishes message to channel
func (r *RedisClient) Publish(ctx context.Context, channel string, message interface{}) error {
	return r.client.Publish(ctx, channel, message).Err()
}

// Subscribe subscribes to channels
func (r *RedisClient) Subscribe(ctx context.Context, channels ...string) (PubSub, error) {
	pubsub := r.client.Subscribe(ctx, channels...)
	return &RedisPubSub{pubsub: pubsub}, nil
}

// Transaction and Pipeline operations

// Multi starts a transaction
func (r *RedisClient) Multi(ctx context.Context) Pipeline {
	return &RedisPipeline{pipe: r.client.TxPipeline()}
}

// Pipeline creates a pipeline
func (r *RedisClient) Pipeline(ctx context.Context) Pipeline {
	return &RedisPipeline{pipe: r.client.Pipeline()}
}

// Lua script operations

// Eval executes a Lua script
func (r *RedisClient) Eval(ctx context.Context, script string, keys []string, args ...interface{}) (interface{}, error) {
	return r.client.Eval(ctx, script, keys, args...).Result()
}

// EvalSha executes a cached Lua script by SHA1
func (r *RedisClient) EvalSha(ctx context.Context, sha1 string, keys []string, args ...interface{}) (interface{}, error) {
	return r.client.EvalSha(ctx, sha1, keys, args...).Result()
}

// ScriptLoad loads a Lua script and returns its SHA1
func (r *RedisClient) ScriptLoad(ctx context.Context, script string) (string, error) {
	return r.client.ScriptLoad(ctx, script).Result()
}

// RedisPubSub implements PubSub interface
type RedisPubSub struct {
	pubsub *redis.PubSub
}

func (p *RedisPubSub) Channel() <-chan *Message {
	ch := make(chan *Message)
	go func() {
		defer close(ch)
		for msg := range p.pubsub.Channel() {
			ch <- &Message{
				Channel: msg.Channel,
				Payload: msg.Payload,
			}
		}
	}()
	return ch
}

func (p *RedisPubSub) Subscribe(ctx context.Context, channels ...string) error {
	return p.pubsub.Subscribe(ctx, channels...)
}

func (p *RedisPubSub) Unsubscribe(ctx context.Context, channels ...string) error {
	return p.pubsub.Unsubscribe(ctx, channels...)
}

func (p *RedisPubSub) Close() error {
	return p.pubsub.Close()
}

// RedisPipeline implements Pipeline interface
type RedisPipeline struct {
	pipe redis.Pipeliner
}

func (p *RedisPipeline) Set(key string, value interface{}, expiration time.Duration) error {
	p.pipe.Set(context.Background(), key, value, expiration)
	return nil
}

func (p *RedisPipeline) Get(key string) (string, error) {
	cmd := p.pipe.Get(context.Background(), key)
	return cmd.Result()
}

func (p *RedisPipeline) Exec(ctx context.Context) error {
	_, err := p.pipe.Exec(ctx)
	return err
}

func (p *RedisPipeline) Discard() error {
	p.pipe.Discard()
	return nil
}
