package testing

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"

	"github.com/LukeAtkinz/dashdice/go-services/shared/models"
)

// Test Suite Base
type BaseTestSuite struct {
	suite.Suite
	Router *gin.Engine
	Server *httptest.Server
}

// SetupSuite sets up the test suite
func (s *BaseTestSuite) SetupSuite() {
	gin.SetMode(gin.TestMode)
	s.Router = gin.New()
	s.Server = httptest.NewServer(s.Router)
}

// TearDownSuite tears down the test suite
func (s *BaseTestSuite) TearDownSuite() {
	if s.Server != nil {
		s.Server.Close()
	}
}

// HTTP Test Helpers

// HTTPTestCase represents an HTTP test case
type HTTPTestCase struct {
	Name           string
	Method         string
	URL            string
	Body           interface{}
	Headers        map[string]string
	ExpectedStatus int
	ExpectedBody   interface{}
	Setup          func()
	Teardown       func()
}

// RunHTTPTest runs an HTTP test case
func (s *BaseTestSuite) RunHTTPTest(tc HTTPTestCase) {
	s.Run(tc.Name, func() {
		// Setup
		if tc.Setup != nil {
			tc.Setup()
		}
		
		// Teardown
		if tc.Teardown != nil {
			defer tc.Teardown()
		}
		
		// Prepare request body
		var bodyReader io.Reader
		if tc.Body != nil {
			bodyBytes, err := json.Marshal(tc.Body)
			require.NoError(s.T(), err)
			bodyReader = bytes.NewBuffer(bodyBytes)
		}
		
		// Create request
		req, err := http.NewRequest(tc.Method, tc.URL, bodyReader)
		require.NoError(s.T(), err)
		
		// Add headers
		if tc.Headers != nil {
			for key, value := range tc.Headers {
				req.Header.Set(key, value)
			}
		}
		
		// Set content type for JSON requests
		if tc.Body != nil && req.Header.Get("Content-Type") == "" {
			req.Header.Set("Content-Type", "application/json")
		}
		
		// Execute request
		resp := httptest.NewRecorder()
		s.Router.ServeHTTP(resp, req)
		
		// Assert status code
		assert.Equal(s.T(), tc.ExpectedStatus, resp.Code)
		
		// Assert response body if expected
		if tc.ExpectedBody != nil {
			var actualBody interface{}
			err := json.Unmarshal(resp.Body.Bytes(), &actualBody)
			require.NoError(s.T(), err)
			assert.Equal(s.T(), tc.ExpectedBody, actualBody)
		}
	})
}

// HTTP Request Builders

// RequestBuilder helps build HTTP requests for testing
type RequestBuilder struct {
	method  string
	url     string
	body    interface{}
	headers map[string]string
}

// NewRequest creates a new request builder
func NewRequest(method, url string) *RequestBuilder {
	return &RequestBuilder{
		method:  method,
		url:     url,
		headers: make(map[string]string),
	}
}

// WithBody adds a body to the request
func (rb *RequestBuilder) WithBody(body interface{}) *RequestBuilder {
	rb.body = body
	return rb
}

// WithHeader adds a header to the request
func (rb *RequestBuilder) WithHeader(key, value string) *RequestBuilder {
	rb.headers[key] = value
	return rb
}

// WithAuth adds authorization header
func (rb *RequestBuilder) WithAuth(token string) *RequestBuilder {
	rb.headers["Authorization"] = "Bearer " + token
}

// WithJSON sets content type to JSON
func (rb *RequestBuilder) WithJSON() *RequestBuilder {
	rb.headers["Content-Type"] = "application/json"
	return rb
}

// Build builds the HTTP request
func (rb *RequestBuilder) Build() (*http.Request, error) {
	var bodyReader io.Reader
	if rb.body != nil {
		bodyBytes, err := json.Marshal(rb.body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewBuffer(bodyBytes)
	}
	
	req, err := http.NewRequest(rb.method, rb.url, bodyReader)
	if err != nil {
		return nil, err
	}
	
	for key, value := range rb.headers {
		req.Header.Set(key, value)
	}
	
	return req, nil
}

// Execute executes the request against a router
func (rb *RequestBuilder) Execute(router *gin.Engine) *httptest.ResponseRecorder {
	req, err := rb.Build()
	if err != nil {
		panic(err)
	}
	
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	return resp
}

// Mock Helpers

// MockDatabase provides a mock database interface
type MockDatabase struct {
	mock.Mock
}

// Get mocks database get operation
func (m *MockDatabase) Get(ctx context.Context, collection, id string, result interface{}) error {
	args := m.Called(ctx, collection, id, result)
	return args.Error(0)
}

// Create mocks database create operation
func (m *MockDatabase) Create(ctx context.Context, collection string, data interface{}) (string, error) {
	args := m.Called(ctx, collection, data)
	return args.String(0), args.Error(1)
}

// Update mocks database update operation
func (m *MockDatabase) Update(ctx context.Context, collection, id string, data interface{}) error {
	args := m.Called(ctx, collection, id, data)
	return args.Error(0)
}

// Delete mocks database delete operation
func (m *MockDatabase) Delete(ctx context.Context, collection, id string) error {
	args := m.Called(ctx, collection, id)
	return args.Error(0)
}

// Query mocks database query operation
func (m *MockDatabase) Query(ctx context.Context, collection string, query map[string]interface{}, result interface{}) error {
	args := m.Called(ctx, collection, query, result)
	return args.Error(0)
}

// MockCache provides a mock cache interface
type MockCache struct {
	mock.Mock
}

// Get mocks cache get operation
func (m *MockCache) Get(ctx context.Context, key string) (interface{}, error) {
	args := m.Called(ctx, key)
	return args.Get(0), args.Error(1)
}

// Set mocks cache set operation
func (m *MockCache) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	args := m.Called(ctx, key, value, expiration)
	return args.Error(0)
}

// Delete mocks cache delete operation
func (m *MockCache) Delete(ctx context.Context, key string) error {
	args := m.Called(ctx, key)
	return args.Error(0)
}

// Exists mocks cache exists operation
func (m *MockCache) Exists(ctx context.Context, key string) (bool, error) {
	args := m.Called(ctx, key)
	return args.Bool(0), args.Error(1)
}

// Test Data Factories

// UserFactory creates test users
type UserFactory struct{}

// CreateUser creates a test user
func (uf *UserFactory) CreateUser(options ...func(*models.User)) *models.User {
	user := &models.User{
		ID:          "test-user-" + generateID(),
		Email:       "test@example.com",
		Username:    "testuser",
		DisplayName: "Test User",
		Bio:         "Test bio",
		Stats: &models.UserStats{
			GamesPlayed:    10,
			GamesWon:       7,
			WinRate:        70.0,
			CurrentStreak:  3,
			LongestStreak:  5,
			ELORating:      1500,
			Rank:           "Intermediate",
			TotalScore:     1000,
		},
		Preferences: &models.UserPreferences{
			Theme:           "dark",
			SoundEnabled:    true,
			MusicEnabled:    true,
			NotificationsEnabled: true,
			Language:        "en",
		},
		Privacy: &models.UserPrivacy{
			ProfilePublic:    true,
			StatsPublic:      true,
			OnlineStatus:     true,
			FriendRequests:   "everyone",
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	
	// Apply options
	for _, option := range options {
		option(user)
	}
	
	return user
}

// WithEmail sets user email
func WithEmail(email string) func(*models.User) {
	return func(u *models.User) {
		u.Email = email
	}
}

// WithUsername sets username
func WithUsername(username string) func(*models.User) {
	return func(u *models.User) {
		u.Username = username
	}
}

// WithELO sets ELO rating
func WithELO(elo int) func(*models.User) {
	return func(u *models.User) {
		if u.Stats == nil {
			u.Stats = &models.UserStats{}
		}
		u.Stats.ELORating = elo
	}
}

// MatchFactory creates test matches
type MatchFactory struct{}

// CreateMatch creates a test match
func (mf *MatchFactory) CreateMatch(options ...func(*models.Match)) *models.Match {
	match := &models.Match{
		ID:       "test-match-" + generateID(),
		GameMode: "classic",
		Status:   "waiting",
		Players:  make([]models.Player, 0),
		Settings: &models.MatchSettings{
			MaxPlayers:      4,
			IsPrivate:       false,
			TurnTimeLimit:   60,
			DiceCount:       2,
			DiceSides:       6,
			TargetScore:     100,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	
	// Apply options
	for _, option := range options {
		option(match)
	}
	
	return match
}

// WithGameMode sets game mode
func WithGameMode(mode string) func(*models.Match) {
	return func(m *models.Match) {
		m.GameMode = mode
	}
}

// WithStatus sets match status
func WithStatus(status string) func(*models.Match) {
	return func(m *models.Match) {
		m.Status = status
	}
}

// WithPlayers adds players to match
func WithPlayers(count int) func(*models.Match) {
	return func(m *models.Match) {
		m.Players = make([]models.Player, count)
		for i := 0; i < count; i++ {
			m.Players[i] = models.Player{
				UserID:      fmt.Sprintf("player-%d", i+1),
				DisplayName: fmt.Sprintf("Player %d", i+1),
				Position:    i,
				Score:       0,
				IsReady:     true,
				JoinedAt:    time.Now(),
			}
		}
	}
}

// NotificationFactory creates test notifications
type NotificationFactory struct{}

// CreateNotification creates a test notification
func (nf *NotificationFactory) CreateNotification(options ...func(*models.Notification)) *models.Notification {
	notification := &models.Notification{
		ID:      "test-notification-" + generateID(),
		UserID:  "test-user",
		Type:    "system",
		Title:   "Test Notification",
		Message: "This is a test notification",
		Read:    false,
		CreatedAt: time.Now(),
	}
	
	// Apply options
	for _, option := range options {
		option(notification)
	}
	
	return notification
}

// WithType sets notification type
func WithType(notifType string) func(*models.Notification) {
	return func(n *models.Notification) {
		n.Type = notifType
	}
}

// WithTitle sets notification title
func WithTitle(title string) func(*models.Notification) {
	return func(n *models.Notification) {
		n.Title = title
	}
}

// WithUserID sets user ID
func WithUserID(userID string) func(*models.Notification) {
	return func(n *models.Notification) {
		n.UserID = userID
	}
}

// Assertion Helpers

// AssertUser asserts user properties
func AssertUser(t *testing.T, expected, actual *models.User) {
	assert.Equal(t, expected.ID, actual.ID)
	assert.Equal(t, expected.Email, actual.Email)
	assert.Equal(t, expected.Username, actual.Username)
	assert.Equal(t, expected.DisplayName, actual.DisplayName)
	
	if expected.Stats != nil && actual.Stats != nil {
		assert.Equal(t, expected.Stats.ELORating, actual.Stats.ELORating)
		assert.Equal(t, expected.Stats.GamesPlayed, actual.Stats.GamesPlayed)
		assert.Equal(t, expected.Stats.GamesWon, actual.Stats.GamesWon)
	}
}

// AssertMatch asserts match properties
func AssertMatch(t *testing.T, expected, actual *models.Match) {
	assert.Equal(t, expected.ID, actual.ID)
	assert.Equal(t, expected.GameMode, actual.GameMode)
	assert.Equal(t, expected.Status, actual.Status)
	assert.Len(t, actual.Players, len(expected.Players))
	
	if expected.Settings != nil && actual.Settings != nil {
		assert.Equal(t, expected.Settings.MaxPlayers, actual.Settings.MaxPlayers)
		assert.Equal(t, expected.Settings.TargetScore, actual.Settings.TargetScore)
	}
}

// AssertNotification asserts notification properties
func AssertNotification(t *testing.T, expected, actual *models.Notification) {
	assert.Equal(t, expected.ID, actual.ID)
	assert.Equal(t, expected.UserID, actual.UserID)
	assert.Equal(t, expected.Type, actual.Type)
	assert.Equal(t, expected.Title, actual.Title)
	assert.Equal(t, expected.Message, actual.Message)
}

// AssertError asserts error properties
func AssertError(t *testing.T, err error, expectedType string, expectedMessage string) {
	require.Error(t, err)
	assert.Contains(t, err.Error(), expectedMessage)
	// Additional error type checking can be added here
}

// AssertHTTPResponse asserts HTTP response properties
func AssertHTTPResponse(t *testing.T, resp *httptest.ResponseRecorder, expectedStatus int, expectedBody interface{}) {
	assert.Equal(t, expectedStatus, resp.Code)
	
	if expectedBody != nil {
		var actualBody interface{}
		err := json.Unmarshal(resp.Body.Bytes(), &actualBody)
		require.NoError(t, err)
		assert.Equal(t, expectedBody, actualBody)
	}
}

// Test Utilities

// generateID generates a simple test ID
func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// CreateTestContext creates a test context
func CreateTestContext(userID, requestID string) context.Context {
	ctx := context.Background()
	ctx = context.WithValue(ctx, "user_id", userID)
	ctx = context.WithValue(ctx, "request_id", requestID)
	return ctx
}

// CreateTestGinContext creates a test gin context
func CreateTestGinContext(method, path string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	resp := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(resp)
	ctx.Request, _ = http.NewRequest(method, path, nil)
	return ctx, resp
}

// Performance Testing

// BenchmarkFunc runs a benchmark test
func BenchmarkFunc(b *testing.B, fn func()) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		fn()
	}
}

// MemoryBenchmark runs memory benchmark
func MemoryBenchmark(b *testing.B, fn func()) {
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		fn()
	}
}

// Integration Test Helpers

// IntegrationTestSuite provides integration test functionality
type IntegrationTestSuite struct {
	BaseTestSuite
	Database MockDatabase
	Cache    MockCache
}

// SetupTest sets up each integration test
func (s *IntegrationTestSuite) SetupTest() {
	s.Database = MockDatabase{}
	s.Cache = MockCache{}
}

// TearDownTest tears down each integration test
func (s *IntegrationTestSuite) TearDownTest() {
	s.Database.AssertExpectations(s.T())
	s.Cache.AssertExpectations(s.T())
}

// Test Runners

// RunUnitTests runs unit tests with setup and teardown
func RunUnitTests(t *testing.T, tests []func(*testing.T)) {
	for i, test := range tests {
		t.Run(fmt.Sprintf("Test_%d", i+1), test)
	}
}

// RunTableTests runs table-driven tests
func RunTableTests[T any](t *testing.T, tests []struct {
	Name     string
	Input    T
	Expected interface{}
	Error    bool
}, testFunc func(T) (interface{}, error)) {
	for _, test := range tests {
		t.Run(test.Name, func(t *testing.T) {
			result, err := testFunc(test.Input)
			
			if test.Error {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, test.Expected, result)
			}
		})
	}
}

// Database Test Helpers

// MockFirestore provides Firestore mocking functionality
type MockFirestore struct {
	mock.Mock
	documents map[string]map[string]interface{}
}

// NewMockFirestore creates a new mock Firestore
func NewMockFirestore() *MockFirestore {
	return &MockFirestore{
		documents: make(map[string]map[string]interface{}),
	}
}

// AddDocument adds a document to the mock
func (m *MockFirestore) AddDocument(collection, id string, data interface{}) {
	if m.documents[collection] == nil {
		m.documents[collection] = make(map[string]interface{})
	}
	m.documents[collection][id] = data
}

// GetDocument gets a document from the mock
func (m *MockFirestore) GetDocument(collection, id string) (interface{}, bool) {
	if docs, exists := m.documents[collection]; exists {
		if doc, exists := docs[id]; exists {
			return doc, true
		}
	}
	return nil, false
}

// WebSocket Test Helpers

// MockWebSocket provides WebSocket testing functionality
type MockWebSocket struct {
	mock.Mock
	Messages []interface{}
}

// SendMessage mocks sending a message
func (m *MockWebSocket) SendMessage(message interface{}) error {
	args := m.Called(message)
	m.Messages = append(m.Messages, message)
	return args.Error(0)
}

// ReceiveMessage mocks receiving a message
func (m *MockWebSocket) ReceiveMessage() (interface{}, error) {
	args := m.Called()
	return args.Get(0), args.Error(1)
}

// GetSentMessages returns all sent messages
func (m *MockWebSocket) GetSentMessages() []interface{} {
	return m.Messages
}

// Test Configuration

// TestConfig provides test configuration
type TestConfig struct {
	DatabaseURL    string
	CacheURL       string
	TestTimeout    time.Duration
	CleanupEnabled bool
}

// DefaultTestConfig returns default test configuration
func DefaultTestConfig() *TestConfig {
	return &TestConfig{
		DatabaseURL:    "memory://test",
		CacheURL:       "memory://test",
		TestTimeout:    30 * time.Second,
		CleanupEnabled: true,
	}
}

// Test Cleanup

// Cleanup provides test cleanup functionality
type Cleanup struct {
	functions []func() error
}

// NewCleanup creates a new cleanup helper
func NewCleanup() *Cleanup {
	return &Cleanup{
		functions: make([]func() error, 0),
	}
}

// Add adds a cleanup function
func (c *Cleanup) Add(fn func() error) {
	c.functions = append(c.functions, fn)
}

// Execute executes all cleanup functions
func (c *Cleanup) Execute() error {
	var errors []string
	
	// Execute in reverse order
	for i := len(c.functions) - 1; i >= 0; i-- {
		if err := c.functions[i](); err != nil {
			errors = append(errors, err.Error())
		}
	}
	
	if len(errors) > 0 {
		return fmt.Errorf("cleanup errors: %s", strings.Join(errors, "; "))
	}
	
	return nil
}
