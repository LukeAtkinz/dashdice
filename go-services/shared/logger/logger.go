package logger

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gopkg.in/natefinch/lumberjack.v2"
)

// Logger levels
const (
	PanicLevel = logrus.PanicLevel
	FatalLevel = logrus.FatalLevel
	ErrorLevel = logrus.ErrorLevel
	WarnLevel  = logrus.WarnLevel
	InfoLevel  = logrus.InfoLevel
	DebugLevel = logrus.DebugLevel
	TraceLevel = logrus.TraceLevel
)

// Logger represents our application logger
type Logger struct {
	*logrus.Logger
	serviceName string
	version     string
}

// Config holds logger configuration
type Config struct {
	Level       string `json:"level" yaml:"level"`
	Format      string `json:"format" yaml:"format"` // json, text
	Output      string `json:"output" yaml:"output"` // stdout, file, both
	Filename    string `json:"filename" yaml:"filename"`
	MaxSize     int    `json:"max_size" yaml:"max_size"`         // MB
	MaxBackups  int    `json:"max_backups" yaml:"max_backups"`   // number of backups
	MaxAge      int    `json:"max_age" yaml:"max_age"`           // days
	Compress    bool   `json:"compress" yaml:"compress"`
	ServiceName string `json:"service_name" yaml:"service_name"`
	Version     string `json:"version" yaml:"version"`
}

// DefaultConfig returns default logger configuration
func DefaultConfig() *Config {
	return &Config{
		Level:       "info",
		Format:      "json",
		Output:      "stdout",
		Filename:    "app.log",
		MaxSize:     100,
		MaxBackups:  3,
		MaxAge:      30,
		Compress:    true,
		ServiceName: "dashdice-service",
		Version:     "1.0.0",
	}
}

// Global logger instance
var globalLogger *Logger

// Initialize initializes the global logger
func Initialize(config *Config) error {
	if config == nil {
		config = DefaultConfig()
	}

	logger := logrus.New()

	// Set log level
	level, err := logrus.ParseLevel(config.Level)
	if err != nil {
		return fmt.Errorf("invalid log level: %s", config.Level)
	}
	logger.SetLevel(level)

	// Set formatter
	switch strings.ToLower(config.Format) {
	case "json":
		logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: time.RFC3339,
			FieldMap: logrus.FieldMap{
				logrus.FieldKeyTime:  "timestamp",
				logrus.FieldKeyLevel: "level",
				logrus.FieldKeyMsg:   "message",
				logrus.FieldKeyFunc:  "caller",
			},
		})
	case "text":
		logger.SetFormatter(&logrus.TextFormatter{
			TimestampFormat: time.RFC3339,
			FullTimestamp:   true,
		})
	default:
		return fmt.Errorf("invalid log format: %s", config.Format)
	}

	// Set output
	if err := setOutput(logger, config); err != nil {
		return fmt.Errorf("failed to set logger output: %w", err)
	}

	// Add caller information
	logger.SetReportCaller(true)

	globalLogger = &Logger{
		Logger:      logger,
		serviceName: config.ServiceName,
		version:     config.Version,
	}

	return nil
}

// setOutput sets the logger output based on configuration
func setOutput(logger *logrus.Logger, config *Config) error {
	switch strings.ToLower(config.Output) {
	case "stdout":
		logger.SetOutput(os.Stdout)
	case "file":
		fileWriter := &lumberjack.Logger{
			Filename:   config.Filename,
			MaxSize:    config.MaxSize,
			MaxBackups: config.MaxBackups,
			MaxAge:     config.MaxAge,
			Compress:   config.Compress,
		}
		logger.SetOutput(fileWriter)
	case "both":
		fileWriter := &lumberjack.Logger{
			Filename:   config.Filename,
			MaxSize:    config.MaxSize,
			MaxBackups: config.MaxBackups,
			MaxAge:     config.MaxAge,
			Compress:   config.Compress,
		}
		multiWriter := io.MultiWriter(os.Stdout, fileWriter)
		logger.SetOutput(multiWriter)
	default:
		return fmt.Errorf("invalid output type: %s", config.Output)
	}
	return nil
}

// Get returns the global logger instance
func Get() *Logger {
	if globalLogger == nil {
		// Initialize with default config if not already initialized
		if err := Initialize(nil); err != nil {
			panic(fmt.Sprintf("failed to initialize logger: %v", err))
		}
	}
	return globalLogger
}

// WithService returns logger with service context
func (l *Logger) WithService(service string) *logrus.Entry {
	return l.WithFields(logrus.Fields{
		"service": service,
		"version": l.version,
	})
}

// WithRequestID returns logger with request ID
func (l *Logger) WithRequestID(requestID string) *logrus.Entry {
	return l.WithField("request_id", requestID)
}

// WithUserID returns logger with user ID
func (l *Logger) WithUserID(userID string) *logrus.Entry {
	return l.WithField("user_id", userID)
}

// WithMatchID returns logger with match ID
func (l *Logger) WithMatchID(matchID string) *logrus.Entry {
	return l.WithField("match_id", matchID)
}

// WithError returns logger with error context
func (l *Logger) WithError(err error) *logrus.Entry {
	return l.Logger.WithError(err)
}

// WithFields returns logger with multiple fields
func (l *Logger) WithFields(fields logrus.Fields) *logrus.Entry {
	// Add service info to all logs
	fields["service"] = l.serviceName
	fields["version"] = l.version
	return l.Logger.WithFields(fields)
}

// Performance logging
func (l *Logger) WithPerformance(operation string, duration time.Duration) *logrus.Entry {
	return l.WithFields(logrus.Fields{
		"operation": operation,
		"duration":  duration.String(),
		"duration_ms": duration.Milliseconds(),
	})
}

// Database logging
func (l *Logger) WithDatabase(operation, table string, duration time.Duration) *logrus.Entry {
	return l.WithFields(logrus.Fields{
		"db_operation": operation,
		"table":        table,
		"duration":     duration.String(),
		"duration_ms":  duration.Milliseconds(),
	})
}

// HTTP logging
func (l *Logger) WithHTTP(method, path string, statusCode int, duration time.Duration) *logrus.Entry {
	return l.WithFields(logrus.Fields{
		"http_method":     method,
		"http_path":       path,
		"http_status":     statusCode,
		"response_time":   duration.String(),
		"response_time_ms": duration.Milliseconds(),
	})
}

// Cache logging
func (l *Logger) WithCache(operation, key string, hit bool) *logrus.Entry {
	return l.WithFields(logrus.Fields{
		"cache_operation": operation,
		"cache_key":       key,
		"cache_hit":       hit,
	})
}

// Queue logging
func (l *Logger) WithQueue(queue string, size int) *logrus.Entry {
	return l.WithFields(logrus.Fields{
		"queue_name": queue,
		"queue_size": size,
	})
}

// Game logging
func (l *Logger) WithGame(matchID, gameMode string, playerCount int) *logrus.Entry {
	return l.WithFields(logrus.Fields{
		"match_id":     matchID,
		"game_mode":    gameMode,
		"player_count": playerCount,
	})
}

// Security logging
func (l *Logger) WithSecurity(event, userID, ip string) *logrus.Entry {
	return l.WithFields(logrus.Fields{
		"security_event": event,
		"user_id":        userID,
		"ip_address":     ip,
		"timestamp":      time.Now().Unix(),
	})
}

// Metrics logging
func (l *Logger) WithMetrics(name string, value interface{}, tags map[string]string) *logrus.Entry {
	fields := logrus.Fields{
		"metric_name":  name,
		"metric_value": value,
	}
	
	// Add tags as fields
	for k, v := range tags {
		fields[fmt.Sprintf("tag_%s", k)] = v
	}
	
	return l.WithFields(fields)
}

// Context logging
func (l *Logger) WithContext(ctx context.Context) *logrus.Entry {
	entry := l.Logger.WithContext(ctx)
	
	// Extract common context values
	if requestID := ctx.Value("request_id"); requestID != nil {
		entry = entry.WithField("request_id", requestID)
	}
	
	if userID := ctx.Value("user_id"); userID != nil {
		entry = entry.WithField("user_id", userID)
	}
	
	return entry.WithFields(logrus.Fields{
		"service": l.serviceName,
		"version": l.version,
	})
}

// Convenience methods for global logger

// Debug logs a debug message
func Debug(args ...interface{}) {
	Get().Debug(args...)
}

// Debugf logs a formatted debug message
func Debugf(format string, args ...interface{}) {
	Get().Debugf(format, args...)
}

// Info logs an info message
func Info(args ...interface{}) {
	Get().Info(args...)
}

// Infof logs a formatted info message
func Infof(format string, args ...interface{}) {
	Get().Infof(format, args...)
}

// Warn logs a warning message
func Warn(args ...interface{}) {
	Get().Warn(args...)
}

// Warnf logs a formatted warning message
func Warnf(format string, args ...interface{}) {
	Get().Warnf(format, args...)
}

// Error logs an error message
func Error(args ...interface{}) {
	Get().Error(args...)
}

// Errorf logs a formatted error message
func Errorf(format string, args ...interface{}) {
	Get().Errorf(format, args...)
}

// Fatal logs a fatal message and exits
func Fatal(args ...interface{}) {
	Get().Fatal(args...)
}

// Fatalf logs a formatted fatal message and exits
func Fatalf(format string, args ...interface{}) {
	Get().Fatalf(format, args...)
}

// Panic logs a panic message and panics
func Panic(args ...interface{}) {
	Get().Panic(args...)
}

// Panicf logs a formatted panic message and panics
func Panicf(format string, args ...interface{}) {
	Get().Panicf(format, args...)
}

// Convenience methods with context

// WithError returns logger with error context
func WithError(err error) *logrus.Entry {
	return Get().WithError(err)
}

// WithFields returns logger with multiple fields
func WithFields(fields logrus.Fields) *logrus.Entry {
	return Get().WithFields(fields)
}

// WithService returns logger with service context
func WithService(service string) *logrus.Entry {
	return Get().WithService(service)
}

// WithRequestID returns logger with request ID
func WithRequestID(requestID string) *logrus.Entry {
	return Get().WithRequestID(requestID)
}

// WithUserID returns logger with user ID
func WithUserID(userID string) *logrus.Entry {
	return Get().WithUserID(userID)
}

// WithMatchID returns logger with match ID
func WithMatchID(matchID string) *logrus.Entry {
	return Get().WithMatchID(matchID)
}

// Middleware

// GinLogger returns gin logging middleware
func GinLogger() gin.HandlerFunc {
	return gin.LoggerWithConfig(gin.LoggerConfig{
		Formatter: ginLogFormatter,
		Output:    Get().Logger.Out,
		SkipPaths: []string{"/health", "/metrics"},
	})
}

// ginLogFormatter formats gin logs
func ginLogFormatter(param gin.LogFormatterParams) string {
	logger := Get()
	
	// Log HTTP request
	entry := logger.WithHTTP(
		param.Method,
		param.Path,
		param.StatusCode,
		param.Latency,
	).WithFields(logrus.Fields{
		"client_ip":    param.ClientIP,
		"user_agent":   param.Request.UserAgent(),
		"error_message": param.ErrorMessage,
	})
	
	// Determine log level based on status code
	switch {
	case param.StatusCode >= 500:
		entry.Error("HTTP request completed")
	case param.StatusCode >= 400:
		entry.Warn("HTTP request completed")
	default:
		entry.Info("HTTP request completed")
	}
	
	return ""
}

// Performance Logging

// Timer represents a performance timer
type Timer struct {
	start     time.Time
	operation string
	logger    *Logger
	fields    logrus.Fields
}

// NewTimer creates a new performance timer
func NewTimer(operation string) *Timer {
	return &Timer{
		start:     time.Now(),
		operation: operation,
		logger:    Get(),
		fields:    make(logrus.Fields),
	}
}

// AddField adds a field to the timer
func (t *Timer) AddField(key string, value interface{}) *Timer {
	t.fields[key] = value
	return t
}

// Stop stops the timer and logs the duration
func (t *Timer) Stop() time.Duration {
	duration := time.Since(t.start)
	
	entry := t.logger.WithPerformance(t.operation, duration)
	if len(t.fields) > 0 {
		entry = entry.WithFields(t.fields)
	}
	
	entry.Info("Operation completed")
	return duration
}

// StopWithError stops the timer and logs with error
func (t *Timer) StopWithError(err error) time.Duration {
	duration := time.Since(t.start)
	
	entry := t.logger.WithPerformance(t.operation, duration).WithError(err)
	if len(t.fields) > 0 {
		entry = entry.WithFields(t.fields)
	}
	
	entry.Error("Operation failed")
	return duration
}

// Database Timer

// DBTimer represents a database operation timer
type DBTimer struct {
	*Timer
	operation string
	table     string
}

// NewDBTimer creates a new database timer
func NewDBTimer(operation, table string) *DBTimer {
	return &DBTimer{
		Timer:     NewTimer("database_operation"),
		operation: operation,
		table:     table,
	}
}

// Stop stops the database timer
func (dt *DBTimer) Stop() time.Duration {
	duration := time.Since(dt.start)
	
	entry := dt.logger.WithDatabase(dt.operation, dt.table, duration)
	if len(dt.fields) > 0 {
		entry = entry.WithFields(dt.fields)
	}
	
	entry.Debug("Database operation completed")
	return duration
}

// StopWithError stops the database timer with error
func (dt *DBTimer) StopWithError(err error) time.Duration {
	duration := time.Since(dt.start)
	
	entry := dt.logger.WithDatabase(dt.operation, dt.table, duration).WithError(err)
	if len(dt.fields) > 0 {
		entry = entry.WithFields(dt.fields)
	}
	
	entry.Error("Database operation failed")
	return duration
}

// Structured Logging Helpers

// LogUserAction logs a user action
func LogUserAction(userID, action string, details map[string]interface{}) {
	fields := logrus.Fields{
		"user_id": userID,
		"action":  action,
	}
	
	for k, v := range details {
		fields[k] = v
	}
	
	Get().WithFields(fields).Info("User action")
}

// LogMatchEvent logs a match event
func LogMatchEvent(matchID, event string, details map[string]interface{}) {
	fields := logrus.Fields{
		"match_id": matchID,
		"event":    event,
	}
	
	for k, v := range details {
		fields[k] = v
	}
	
	Get().WithFields(fields).Info("Match event")
}

// LogSecurityEvent logs a security event
func LogSecurityEvent(event, userID, ip string, details map[string]interface{}) {
	fields := logrus.Fields{
		"security_event": event,
		"user_id":        userID,
		"ip_address":     ip,
	}
	
	for k, v := range details {
		fields[k] = v
	}
	
	Get().WithFields(fields).Warn("Security event")
}

// LogSystemEvent logs a system event
func LogSystemEvent(event string, details map[string]interface{}) {
	fields := logrus.Fields{
		"system_event": event,
	}
	
	for k, v := range details {
		fields[k] = v
	}
	
	Get().WithFields(fields).Info("System event")
}

// LogAPICall logs an API call
func LogAPICall(method, path, userID string, statusCode int, duration time.Duration) {
	entry := Get().WithFields(logrus.Fields{
		"api_method":      method,
		"api_path":        path,
		"user_id":         userID,
		"status_code":     statusCode,
		"response_time":   duration.String(),
		"response_time_ms": duration.Milliseconds(),
	})
	
	switch {
	case statusCode >= 500:
		entry.Error("API call failed")
	case statusCode >= 400:
		entry.Warn("API call error")
	default:
		entry.Info("API call completed")
	}
}

// Health Check Logging

// LogHealthCheck logs a health check result
func LogHealthCheck(service string, healthy bool, details map[string]interface{}) {
	fields := logrus.Fields{
		"health_check": service,
		"healthy":      healthy,
	}
	
	for k, v := range details {
		fields[k] = v
	}
	
	entry := Get().WithFields(fields)
	if healthy {
		entry.Debug("Health check passed")
	} else {
		entry.Error("Health check failed")
	}
}

// Cleanup

// Sync flushes any buffered log entries
func Sync() error {
	// logrus doesn't have a sync method, but we can call it on the underlying writer
	if syncer, ok := Get().Logger.Out.(interface{ Sync() error }); ok {
		return syncer.Sync()
	}
	return nil
}

// SetLevel sets the global log level
func SetLevel(level string) error {
	parsedLevel, err := logrus.ParseLevel(level)
	if err != nil {
		return err
	}
	
	Get().Logger.SetLevel(parsedLevel)
	return nil
}

// GetLevel returns the current log level
func GetLevel() string {
	return Get().Logger.GetLevel().String()
}

// Caller information

// GetCaller returns caller information
func GetCaller(skip int) string {
	_, file, line, ok := runtime.Caller(skip + 1)
	if !ok {
		return "unknown"
	}
	
	return fmt.Sprintf("%s:%d", filepath.Base(file), line)
}

// AddCaller adds caller information to fields
func AddCaller(fields logrus.Fields, skip int) logrus.Fields {
	if fields == nil {
		fields = make(logrus.Fields)
	}
	fields["caller"] = GetCaller(skip + 1)
	return fields
}
