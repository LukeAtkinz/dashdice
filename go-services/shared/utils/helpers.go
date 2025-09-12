package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
	
	"github.com/google/uuid"
)

// ID generation utilities

// GenerateID generates a UUID v4
func GenerateID() string {
	return uuid.New().String()
}

// GenerateShortID generates a shorter random ID
func GenerateShortID(length int) string {
	bytes := make([]byte, length/2+1)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)[:length]
}

// GenerateMatchID generates a match-specific ID with prefix
func GenerateMatchID() string {
	return "match_" + GenerateShortID(12)
}

// GenerateSessionID generates a session-specific ID with prefix
func GenerateSessionID() string {
	return "session_" + GenerateShortID(16)
}

// GenerateRoomCode generates a human-readable room code
func GenerateRoomCode() string {
	// Generate 6-character alphanumeric code (no ambiguous characters)
	chars := "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	code := make([]byte, 6)
	for i := range code {
		randomBytes := make([]byte, 1)
		rand.Read(randomBytes)
		code[i] = chars[int(randomBytes[0])%len(chars)]
	}
	return string(code)
}

// Time utilities

// CurrentTimestamp returns the current Unix timestamp
func CurrentTimestamp() int64 {
	return time.Now().Unix()
}

// CurrentTimestampMS returns the current Unix timestamp in milliseconds
func CurrentTimestampMS() int64 {
	return time.Now().UnixNano() / int64(time.Millisecond)
}

// TimeFromTimestamp converts Unix timestamp to time.Time
func TimeFromTimestamp(timestamp int64) time.Time {
	return time.Unix(timestamp, 0)
}

// TimeFromTimestampMS converts Unix timestamp in milliseconds to time.Time
func TimeFromTimestampMS(timestamp int64) time.Time {
	return time.Unix(0, timestamp*int64(time.Millisecond))
}

// FormatDuration formats a duration in human-readable format
func FormatDuration(duration time.Duration) string {
	if duration < time.Minute {
		return fmt.Sprintf("%ds", int(duration.Seconds()))
	} else if duration < time.Hour {
		return fmt.Sprintf("%dm %ds", int(duration.Minutes()), int(duration.Seconds())%60)
	} else {
		return fmt.Sprintf("%dh %dm", int(duration.Hours()), int(duration.Minutes())%60)
	}
}

// IsExpired checks if a timestamp is expired given a duration
func IsExpired(timestamp int64, duration time.Duration) bool {
	expiryTime := time.Unix(timestamp, 0).Add(duration)
	return time.Now().After(expiryTime)
}

// String utilities

// StringPtr returns a pointer to a string (useful for optional fields)
func StringPtr(s string) *string {
	return &s
}

// IntPtr returns a pointer to an int
func IntPtr(i int) *int {
	return &i
}

// BoolPtr returns a pointer to a bool
func BoolPtr(b bool) *bool {
	return &b
}

// StringFromPtr returns the value of a string pointer or empty string if nil
func StringFromPtr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// IntFromPtr returns the value of an int pointer or zero if nil
func IntFromPtr(i *int) int {
	if i == nil {
		return 0
	}
	return *i
}

// BoolFromPtr returns the value of a bool pointer or false if nil
func BoolFromPtr(b *bool) bool {
	if b == nil {
		return false
	}
	return *b
}

// TruncateString truncates a string to a maximum length
func TruncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

// SanitizeString removes or replaces dangerous characters
func SanitizeString(s string) string {
	// Remove control characters and normalize whitespace
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\r", " ")
	s = strings.ReplaceAll(s, "\t", " ")
	
	// Normalize multiple spaces
	for strings.Contains(s, "  ") {
		s = strings.ReplaceAll(s, "  ", " ")
	}
	
	return strings.TrimSpace(s)
}

// Math utilities

// MinInt returns the minimum of two integers
func MinInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// MaxInt returns the maximum of two integers
func MaxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// ClampInt clamps an integer between min and max values
func ClampInt(value, min, max int) int {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

// MinFloat64 returns the minimum of two float64 values
func MinFloat64(a, b float64) float64 {
	return math.Min(a, b)
}

// MaxFloat64 returns the maximum of two float64 values
func MaxFloat64(a, b float64) float64 {
	return math.Max(a, b)
}

// ClampFloat64 clamps a float64 between min and max values
func ClampFloat64(value, min, max float64) float64 {
	return math.Min(math.Max(value, min), max)
}

// RoundToDecimalPlaces rounds a float64 to a specified number of decimal places
func RoundToDecimalPlaces(value float64, places int) float64 {
	multiplier := math.Pow(10, float64(places))
	return math.Round(value*multiplier) / multiplier
}

// Slice utilities

// ContainsString checks if a string slice contains a specific string
func ContainsString(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// ContainsInt checks if an int slice contains a specific int
func ContainsInt(slice []int, item int) bool {
	for _, i := range slice {
		if i == item {
			return true
		}
	}
	return false
}

// RemoveString removes a string from a slice
func RemoveString(slice []string, item string) []string {
	result := make([]string, 0, len(slice))
	for _, s := range slice {
		if s != item {
			result = append(result, s)
		}
	}
	return result
}

// RemoveInt removes an int from a slice
func RemoveInt(slice []int, item int) []int {
	result := make([]int, 0, len(slice))
	for _, i := range slice {
		if i != item {
			result = append(result, i)
		}
	}
	return result
}

// DeduplicateStrings removes duplicates from a string slice
func DeduplicateStrings(slice []string) []string {
	keys := make(map[string]bool)
	result := make([]string, 0, len(slice))
	
	for _, item := range slice {
		if !keys[item] {
			keys[item] = true
			result = append(result, item)
		}
	}
	
	return result
}

// DeduplicateInts removes duplicates from an int slice
func DeduplicateInts(slice []int) []int {
	keys := make(map[int]bool)
	result := make([]int, 0, len(slice))
	
	for _, item := range slice {
		if !keys[item] {
			keys[item] = true
			result = append(result, item)
		}
	}
	
	return result
}

// Conversion utilities

// StringToInt converts string to int with default fallback
func StringToInt(s string, defaultValue int) int {
	if i, err := strconv.Atoi(s); err == nil {
		return i
	}
	return defaultValue
}

// StringToFloat64 converts string to float64 with default fallback
func StringToFloat64(s string, defaultValue float64) float64 {
	if f, err := strconv.ParseFloat(s, 64); err == nil {
		return f
	}
	return defaultValue
}

// StringToBool converts string to bool with default fallback
func StringToBool(s string, defaultValue bool) bool {
	if b, err := strconv.ParseBool(s); err == nil {
		return b
	}
	return defaultValue
}

// IntToString converts int to string
func IntToString(i int) string {
	return strconv.Itoa(i)
}

// Float64ToString converts float64 to string with specified precision
func Float64ToString(f float64, precision int) string {
	return strconv.FormatFloat(f, 'f', precision, 64)
}

// BoolToString converts bool to string
func BoolToString(b bool) string {
	return strconv.FormatBool(b)
}

// Map utilities

// MapKeys returns all keys from a string map
func MapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// MapHasKey checks if a map has a specific key
func MapHasKey(m map[string]interface{}, key string) bool {
	_, exists := m[key]
	return exists
}

// MapGetString gets a string value from a map with default fallback
func MapGetString(m map[string]interface{}, key, defaultValue string) string {
	if val, exists := m[key]; exists {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return defaultValue
}

// MapGetInt gets an int value from a map with default fallback
func MapGetInt(m map[string]interface{}, key string, defaultValue int) int {
	if val, exists := m[key]; exists {
		switch v := val.(type) {
		case int:
			return v
		case float64:
			return int(v)
		case string:
			return StringToInt(v, defaultValue)
		}
	}
	return defaultValue
}

// MapGetBool gets a bool value from a map with default fallback
func MapGetBool(m map[string]interface{}, key string, defaultValue bool) bool {
	if val, exists := m[key]; exists {
		if b, ok := val.(bool); ok {
			return b
		}
	}
	return defaultValue
}

// Validation utilities

// IsValidEmail performs basic email validation
func IsValidEmail(email string) bool {
	return strings.Contains(email, "@") && len(email) > 3
}

// IsValidUsername checks if a username is valid
func IsValidUsername(username string) bool {
	if len(username) < 3 || len(username) > 20 {
		return false
	}
	
	// Check for valid characters (alphanumeric and underscore)
	for _, r := range username {
		if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || 
			 (r >= '0' && r <= '9') || r == '_') {
			return false
		}
	}
	
	return true
}

// IsValidRoomCode checks if a room code is valid
func IsValidRoomCode(code string) bool {
	if len(code) != 6 {
		return false
	}
	
	validChars := "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	for _, r := range code {
		if !strings.ContainsRune(validChars, r) {
			return false
		}
	}
	
	return true
}

// Error utilities

// IfError returns the second parameter if error is not nil, otherwise returns the first
func IfError(value interface{}, err error, defaultValue interface{}) interface{} {
	if err != nil {
		return defaultValue
	}
	return value
}

// Debug utilities

// PrettyPrintJSON returns a formatted JSON string for debugging
func PrettyPrintJSON(v interface{}) string {
	// This would typically use json.MarshalIndent
	// Simplified for this example
	return fmt.Sprintf("%+v", v)
}
