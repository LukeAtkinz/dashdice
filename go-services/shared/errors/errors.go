package errors

import (
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// Error Types
const (
	// Client Errors (4xx)
	ErrTypeBadRequest     = "bad_request"
	ErrTypeUnauthorized   = "unauthorized"
	ErrTypeForbidden      = "forbidden"
	ErrTypeNotFound       = "not_found"
	ErrTypeConflict       = "conflict"
	ErrTypeValidation     = "validation_error"
	ErrTypeRateLimit      = "rate_limit"
	ErrTypeTimeout        = "timeout"
	
	// Server Errors (5xx)
	ErrTypeInternal       = "internal_error"
	ErrTypeDatabase       = "database_error"
	ErrTypeService        = "service_error"
	ErrTypeNetwork        = "network_error"
	ErrTypeConfig         = "configuration_error"
	
	// Custom Business Errors
	ErrTypeMatchFull      = "match_full"
	ErrTypeMatchNotFound  = "match_not_found"
	ErrTypePlayerNotFound = "player_not_found"
	ErrTypeGameInProgress = "game_in_progress"
	ErrTypeInvalidMove    = "invalid_move"
	ErrTypeAlreadyInQueue = "already_in_queue"
	ErrTypeNotInQueue     = "not_in_queue"
	ErrTypeUserOffline    = "user_offline"
	ErrTypeInsufficientFunds = "insufficient_funds"
)

// AppError represents an application error
type AppError struct {
	Type       string                 `json:"type"`
	Message    string                 `json:"message"`
	Details    map[string]interface{} `json:"details,omitempty"`
	StatusCode int                    `json:"status_code"`
	Timestamp  time.Time              `json:"timestamp"`
	RequestID  string                 `json:"request_id,omitempty"`
	UserID     string                 `json:"user_id,omitempty"`
	StackTrace []string               `json:"stack_trace,omitempty"`
	Cause      error                  `json:"-"` // Original error, not serialized
}

// Error implements the error interface
func (e *AppError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("%s: %s (caused by: %s)", e.Type, e.Message, e.Cause.Error())
	}
	return fmt.Sprintf("%s: %s", e.Type, e.Message)
}

// Unwrap returns the underlying error
func (e *AppError) Unwrap() error {
	return e.Cause
}

// AddDetail adds a detail to the error
func (e *AppError) AddDetail(key string, value interface{}) *AppError {
	if e.Details == nil {
		e.Details = make(map[string]interface{})
	}
	e.Details[key] = value
	return e
}

// WithRequestID adds a request ID to the error
func (e *AppError) WithRequestID(requestID string) *AppError {
	e.RequestID = requestID
	return e
}

// WithUserID adds a user ID to the error
func (e *AppError) WithUserID(userID string) *AppError {
	e.UserID = userID
	return e
}

// WithStackTrace adds a stack trace to the error
func (e *AppError) WithStackTrace() *AppError {
	const maxStackDepth = 10
	pcs := make([]uintptr, maxStackDepth)
	depth := runtime.Callers(2, pcs)
	
	e.StackTrace = make([]string, 0, depth)
	frames := runtime.CallersFrames(pcs[:depth])
	
	for {
		frame, more := frames.Next()
		e.StackTrace = append(e.StackTrace, fmt.Sprintf("%s:%d %s", frame.File, frame.Line, frame.Function))
		if !more {
			break
		}
	}
	
	return e
}

// ToJSON converts the error to JSON
func (e *AppError) ToJSON() string {
	data, _ := json.Marshal(e)
	return string(data)
}

// New creates a new application error
func New(errType, message string, statusCode int) *AppError {
	return &AppError{
		Type:       errType,
		Message:    message,
		StatusCode: statusCode,
		Timestamp:  time.Now(),
	}
}

// Wrap creates a new application error wrapping an existing error
func Wrap(err error, errType, message string, statusCode int) *AppError {
	return &AppError{
		Type:       errType,
		Message:    message,
		StatusCode: statusCode,
		Timestamp:  time.Now(),
		Cause:      err,
	}
}

// Predefined Error Constructors

// BadRequest creates a bad request error
func BadRequest(message string) *AppError {
	return New(ErrTypeBadRequest, message, http.StatusBadRequest)
}

// BadRequestf creates a bad request error with formatting
func BadRequestf(format string, args ...interface{}) *AppError {
	return BadRequest(fmt.Sprintf(format, args...))
}

// Unauthorized creates an unauthorized error
func Unauthorized(message string) *AppError {
	return New(ErrTypeUnauthorized, message, http.StatusUnauthorized)
}

// Forbidden creates a forbidden error
func Forbidden(message string) *AppError {
	return New(ErrTypeForbidden, message, http.StatusForbidden)
}

// NotFound creates a not found error
func NotFound(resource string) *AppError {
	return New(ErrTypeNotFound, fmt.Sprintf("%s not found", resource), http.StatusNotFound)
}

// Conflict creates a conflict error
func Conflict(message string) *AppError {
	return New(ErrTypeConflict, message, http.StatusConflict)
}

// ValidationError creates a validation error
func ValidationError(message string) *AppError {
	return New(ErrTypeValidation, message, http.StatusBadRequest)
}

// RateLimit creates a rate limit error
func RateLimit(message string) *AppError {
	if message == "" {
		message = "Rate limit exceeded"
	}
	return New(ErrTypeRateLimit, message, http.StatusTooManyRequests)
}

// Timeout creates a timeout error
func Timeout(operation string) *AppError {
	return New(ErrTypeTimeout, fmt.Sprintf("Operation %s timed out", operation), http.StatusRequestTimeout)
}

// Internal creates an internal server error
func Internal(message string) *AppError {
	return New(ErrTypeInternal, message, http.StatusInternalServerError)
}

// InternalWrap creates an internal server error wrapping another error
func InternalWrap(err error, message string) *AppError {
	return Wrap(err, ErrTypeInternal, message, http.StatusInternalServerError)
}

// Database creates a database error
func Database(message string) *AppError {
	return New(ErrTypeDatabase, message, http.StatusInternalServerError)
}

// DatabaseWrap creates a database error wrapping another error
func DatabaseWrap(err error, operation string) *AppError {
	return Wrap(err, ErrTypeDatabase, fmt.Sprintf("Database operation failed: %s", operation), http.StatusInternalServerError)
}

// Service creates a service error
func Service(service, message string) *AppError {
	return New(ErrTypeService, fmt.Sprintf("Service %s error: %s", service, message), http.StatusInternalServerError)
}

// ServiceWrap creates a service error wrapping another error
func ServiceWrap(err error, service string) *AppError {
	return Wrap(err, ErrTypeService, fmt.Sprintf("Service %s error", service), http.StatusInternalServerError)
}

// Network creates a network error
func Network(message string) *AppError {
	return New(ErrTypeNetwork, message, http.StatusBadGateway)
}

// NetworkWrap creates a network error wrapping another error
func NetworkWrap(err error, operation string) *AppError {
	return Wrap(err, ErrTypeNetwork, fmt.Sprintf("Network operation failed: %s", operation), http.StatusBadGateway)
}

// Business Logic Errors

// MatchFull creates a match full error
func MatchFull(matchID string) *AppError {
	return New(ErrTypeMatchFull, "Match is full", http.StatusConflict).
		AddDetail("match_id", matchID)
}

// MatchNotFound creates a match not found error
func MatchNotFound(matchID string) *AppError {
	return New(ErrTypeMatchNotFound, "Match not found", http.StatusNotFound).
		AddDetail("match_id", matchID)
}

// PlayerNotFound creates a player not found error
func PlayerNotFound(playerID string) *AppError {
	return New(ErrTypePlayerNotFound, "Player not found", http.StatusNotFound).
		AddDetail("player_id", playerID)
}

// GameInProgress creates a game in progress error
func GameInProgress(matchID string) *AppError {
	return New(ErrTypeGameInProgress, "Game is already in progress", http.StatusConflict).
		AddDetail("match_id", matchID)
}

// InvalidMove creates an invalid move error
func InvalidMove(message string) *AppError {
	return New(ErrTypeInvalidMove, message, http.StatusBadRequest)
}

// AlreadyInQueue creates an already in queue error
func AlreadyInQueue(userID string) *AppError {
	return New(ErrTypeAlreadyInQueue, "User is already in queue", http.StatusConflict).
		AddDetail("user_id", userID)
}

// NotInQueue creates a not in queue error
func NotInQueue(userID string) *AppError {
	return New(ErrTypeNotInQueue, "User is not in queue", http.StatusConflict).
		AddDetail("user_id", userID)
}

// UserOffline creates a user offline error
func UserOffline(userID string) *AppError {
	return New(ErrTypeUserOffline, "User is offline", http.StatusConflict).
		AddDetail("user_id", userID)
}

// InsufficientFunds creates an insufficient funds error
func InsufficientFunds(required, available int) *AppError {
	return New(ErrTypeInsufficientFunds, "Insufficient funds", http.StatusBadRequest).
		AddDetail("required", required).
		AddDetail("available", available)
}

// Error Response Structure
type ErrorResponse struct {
	Error     *AppError `json:"error"`
	Success   bool      `json:"success"`
	Timestamp time.Time `json:"timestamp"`
}

// NewErrorResponse creates a new error response
func NewErrorResponse(err *AppError) *ErrorResponse {
	return &ErrorResponse{
		Error:     err,
		Success:   false,
		Timestamp: time.Now(),
	}
}

// Middleware for error handling
func ErrorHandler() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		var err *AppError
		
		switch e := recovered.(type) {
		case *AppError:
			err = e
		case error:
			err = InternalWrap(e, "Unexpected error occurred")
		default:
			err = Internal(fmt.Sprintf("Unexpected panic: %v", recovered))
		}
		
		// Add request context
		if requestID := c.GetString("request_id"); requestID != "" {
			err.WithRequestID(requestID)
		}
		
		if userID := c.GetString("user_id"); userID != "" {
			err.WithUserID(userID)
		}
		
		// Add stack trace for server errors
		if err.StatusCode >= 500 {
			err.WithStackTrace()
		}
		
		// Log the error
		logError(c, err)
		
		// Respond with error
		c.JSON(err.StatusCode, NewErrorResponse(err))
	})
}

// AbortWithError aborts the request with an application error
func AbortWithError(c *gin.Context, err *AppError) {
	// Add request context
	if requestID := c.GetString("request_id"); requestID != "" {
		err.WithRequestID(requestID)
	}
	
	if userID := c.GetString("user_id"); userID != "" {
		err.WithUserID(userID)
	}
	
	// Log the error
	logError(c, err)
	
	// Abort with error response
	c.AbortWithStatusJSON(err.StatusCode, NewErrorResponse(err))
}

// HandleError handles an error in a gin context
func HandleError(c *gin.Context, err error) {
	var appErr *AppError
	
	switch e := err.(type) {
	case *AppError:
		appErr = e
	case error:
		// Try to determine error type from error message
		appErr = categorizeError(e)
	}
	
	AbortWithError(c, appErr)
}

// categorizeError attempts to categorize a generic error
func categorizeError(err error) *AppError {
	errMsg := strings.ToLower(err.Error())
	
	switch {
	case strings.Contains(errMsg, "not found"):
		return NotFound("resource")
	case strings.Contains(errMsg, "unauthorized") || strings.Contains(errMsg, "invalid token"):
		return Unauthorized("Authentication required")
	case strings.Contains(errMsg, "forbidden") || strings.Contains(errMsg, "access denied"):
		return Forbidden("Access denied")
	case strings.Contains(errMsg, "timeout") || strings.Contains(errMsg, "deadline exceeded"):
		return Timeout("operation")
	case strings.Contains(errMsg, "connection") || strings.Contains(errMsg, "network"):
		return NetworkWrap(err, "network operation")
	case strings.Contains(errMsg, "database") || strings.Contains(errMsg, "sql"):
		return DatabaseWrap(err, "database operation")
	case strings.Contains(errMsg, "validation") || strings.Contains(errMsg, "invalid"):
		return ValidationError(err.Error())
	default:
		return InternalWrap(err, "Internal server error")
	}
}

// logError logs an error with appropriate level and context
func logError(c *gin.Context, err *AppError) {
	logger := logrus.WithFields(logrus.Fields{
		"type":        err.Type,
		"status_code": err.StatusCode,
		"request_id":  err.RequestID,
		"user_id":     err.UserID,
		"method":      c.Request.Method,
		"path":        c.Request.URL.Path,
		"ip":          c.ClientIP(),
		"user_agent":  c.Request.UserAgent(),
	})
	
	// Add details if present
	if err.Details != nil {
		logger = logger.WithField("details", err.Details)
	}
	
	// Add stack trace for server errors
	if err.StatusCode >= 500 && len(err.StackTrace) > 0 {
		logger = logger.WithField("stack_trace", err.StackTrace)
	}
	
	// Log with appropriate level
	switch {
	case err.StatusCode >= 500:
		logger.Error(err.Error())
	case err.StatusCode >= 400:
		logger.Warn(err.Error())
	default:
		logger.Info(err.Error())
	}
}

// IsType checks if an error is of a specific type
func IsType(err error, errType string) bool {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Type == errType
	}
	return false
}

// IsClientError checks if an error is a client error (4xx)
func IsClientError(err error) bool {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.StatusCode >= 400 && appErr.StatusCode < 500
	}
	return false
}

// IsServerError checks if an error is a server error (5xx)
func IsServerError(err error) bool {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.StatusCode >= 500
	}
	return false
}

// GetStatusCode extracts the HTTP status code from an error
func GetStatusCode(err error) int {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.StatusCode
	}
	return http.StatusInternalServerError
}

// Must panics if error is not nil (useful for initialization)
func Must(err error) {
	if err != nil {
		panic(err)
	}
}

// Validation Error Helpers

// ValidationErrors represents multiple validation errors
type ValidationErrors map[string][]string

// AddError adds a validation error for a field
func (ve ValidationErrors) AddError(field, message string) {
	if ve[field] == nil {
		ve[field] = make([]string, 0)
	}
	ve[field] = append(ve[field], message)
}

// HasErrors returns true if there are validation errors
func (ve ValidationErrors) HasErrors() bool {
	return len(ve) > 0
}

// ToAppError converts validation errors to an app error
func (ve ValidationErrors) ToAppError() *AppError {
	if !ve.HasErrors() {
		return nil
	}
	
	err := ValidationError("Validation failed")
	err.Details = map[string]interface{}{
		"validation_errors": ve,
	}
	
	return err
}

// Error implements the error interface
func (ve ValidationErrors) Error() string {
	var messages []string
	for field, errs := range ve {
		for _, err := range errs {
			messages = append(messages, fmt.Sprintf("%s: %s", field, err))
		}
	}
	return strings.Join(messages, "; ")
}

// Multi-Error Support

// MultiError represents multiple errors
type MultiError []error

// Error implements the error interface
func (me MultiError) Error() string {
	var messages []string
	for _, err := range me {
		messages = append(messages, err.Error())
	}
	return strings.Join(messages, "; ")
}

// Add adds an error to the multi-error
func (me *MultiError) Add(err error) {
	if err != nil {
		*me = append(*me, err)
	}
}

// HasErrors returns true if there are errors
func (me MultiError) HasErrors() bool {
	return len(me) > 0
}

// ToAppError converts multi-error to app error
func (me MultiError) ToAppError() *AppError {
	if !me.HasErrors() {
		return nil
	}
	
	if len(me) == 1 {
		if appErr, ok := me[0].(*AppError); ok {
			return appErr
		}
		return InternalWrap(me[0], "Error occurred")
	}
	
	return Internal("Multiple errors occurred").AddDetail("errors", me.Error())
}

// Error Recovery

// SafeExecute executes a function and recovers from panics
func SafeExecute(fn func() error) (err error) {
	defer func() {
		if recovered := recover(); recovered != nil {
			switch e := recovered.(type) {
			case *AppError:
				err = e
			case error:
				err = InternalWrap(e, "Panic occurred")
			default:
				err = Internal(fmt.Sprintf("Panic occurred: %v", recovered))
			}
		}
	}()
	
	return fn()
}

// Context Keys
const (
	ErrorContextKey = "error_context"
)

// AddErrorContext adds error context to gin context
func AddErrorContext(c *gin.Context, key string, value interface{}) {
	if ctx, exists := c.Get(ErrorContextKey); exists {
		if contextMap, ok := ctx.(map[string]interface{}); ok {
			contextMap[key] = value
			return
		}
	}
	
	c.Set(ErrorContextKey, map[string]interface{}{key: value})
}

// GetErrorContext gets error context from gin context
func GetErrorContext(c *gin.Context) map[string]interface{} {
	if ctx, exists := c.Get(ErrorContextKey); exists {
		if contextMap, ok := ctx.(map[string]interface{}); ok {
			return contextMap
		}
	}
	return make(map[string]interface{})
}
