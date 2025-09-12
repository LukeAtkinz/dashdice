package validation

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/LukeAtkinz/dashdice/go-services/shared/models"
	"github.com/LukeAtkinz/dashdice/go-services/shared/utils"
)

var (
	// Common validation errors
	ErrRequired        = errors.New("field is required")
	ErrInvalidFormat   = errors.New("invalid format")
	ErrInvalidLength   = errors.New("invalid length")
	ErrInvalidValue    = errors.New("invalid value")
	ErrInvalidRange    = errors.New("value out of range")
	ErrDuplicateValue  = errors.New("duplicate value")
	ErrInvalidEmail    = errors.New("invalid email format")
	ErrInvalidUsername = errors.New("invalid username format")
	ErrWeakPassword    = errors.New("password too weak")
)

// ValidationError represents a field validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code"`
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// ValidationErrors represents multiple validation errors
type ValidationErrors []ValidationError

func (e ValidationErrors) Error() string {
	if len(e) == 0 {
		return ""
	}
	
	var messages []string
	for _, err := range e {
		messages = append(messages, err.Error())
	}
	
	return strings.Join(messages, "; ")
}

// HasErrors returns true if there are validation errors
func (e ValidationErrors) HasErrors() bool {
	return len(e) > 0
}

// AddError adds a validation error
func (e *ValidationErrors) AddError(field, message, code string) {
	*e = append(*e, ValidationError{
		Field:   field,
		Message: message,
		Code:    code,
	})
}

// Validator provides validation functionality
type Validator struct {
	errors ValidationErrors
}

// NewValidator creates a new validator instance
func NewValidator() *Validator {
	return &Validator{
		errors: make(ValidationErrors, 0),
	}
}

// HasErrors returns true if there are validation errors
func (v *Validator) HasErrors() bool {
	return v.errors.HasErrors()
}

// GetErrors returns all validation errors
func (v *Validator) GetErrors() ValidationErrors {
	return v.errors
}

// AddError adds a validation error
func (v *Validator) AddError(field, message, code string) {
	v.errors.AddError(field, message, code)
}

// Reset clears all validation errors
func (v *Validator) Reset() {
	v.errors = make(ValidationErrors, 0)
}

// Basic Validation Methods

// Required validates that a string field is not empty
func (v *Validator) Required(field, value string) *Validator {
	if utils.IsEmpty(value) {
		v.AddError(field, "field is required", "required")
	}
	return v
}

// MinLength validates minimum string length
func (v *Validator) MinLength(field, value string, min int) *Validator {
	if utf8.RuneCountInString(value) < min {
		v.AddError(field, fmt.Sprintf("must be at least %d characters", min), "min_length")
	}
	return v
}

// MaxLength validates maximum string length
func (v *Validator) MaxLength(field, value string, max int) *Validator {
	if utf8.RuneCountInString(value) > max {
		v.AddError(field, fmt.Sprintf("must be no more than %d characters", max), "max_length")
	}
	return v
}

// Range validates string length is within range
func (v *Validator) Range(field, value string, min, max int) *Validator {
	length := utf8.RuneCountInString(value)
	if length < min || length > max {
		v.AddError(field, fmt.Sprintf("must be between %d and %d characters", min, max), "range")
	}
	return v
}

// MinInt validates minimum integer value
func (v *Validator) MinInt(field string, value, min int) *Validator {
	if value < min {
		v.AddError(field, fmt.Sprintf("must be at least %d", min), "min_value")
	}
	return v
}

// MaxInt validates maximum integer value
func (v *Validator) MaxInt(field string, value, max int) *Validator {
	if value > max {
		v.AddError(field, fmt.Sprintf("must be no more than %d", max), "max_value")
	}
	return v
}

// RangeInt validates integer is within range
func (v *Validator) RangeInt(field string, value, min, max int) *Validator {
	if value < min || value > max {
		v.AddError(field, fmt.Sprintf("must be between %d and %d", min, max), "range")
	}
	return v
}

// Email validates email format
func (v *Validator) Email(field, value string) *Validator {
	if !utils.IsEmpty(value) && !utils.IsValidEmail(value) {
		v.AddError(field, "invalid email format", "invalid_email")
	}
	return v
}

// Username validates username format
func (v *Validator) Username(field, value string) *Validator {
	if !utils.IsEmpty(value) && !utils.IsValidUsername(value) {
		v.AddError(field, "invalid username format (3-20 chars, alphanumeric, underscore, hyphen only)", "invalid_username")
	}
	return v
}

// Password validates password strength
func (v *Validator) Password(field, value string) *Validator {
	if !utils.IsEmpty(value) && !utils.IsStrongPassword(value) {
		v.AddError(field, "password must be at least 8 characters with uppercase, lowercase, number, and special character", "weak_password")
	}
	return v
}

// OneOf validates that value is one of the allowed values
func (v *Validator) OneOf(field, value string, allowed []string) *Validator {
	if !utils.IsEmpty(value) && !utils.Contains(allowed, value) {
		v.AddError(field, fmt.Sprintf("must be one of: %s", strings.Join(allowed, ", ")), "invalid_value")
	}
	return v
}

// Regex validates that value matches a regular expression
func (v *Validator) Regex(field, value, pattern, message string) *Validator {
	if !utils.IsEmpty(value) {
		if matched, err := regexp.MatchString(pattern, value); err != nil || !matched {
			v.AddError(field, message, "invalid_format")
		}
	}
	return v
}

// Custom validates using a custom validation function
func (v *Validator) Custom(field string, fn func() error) *Validator {
	if err := fn(); err != nil {
		v.AddError(field, err.Error(), "custom_validation")
	}
	return v
}

// User Validation

// ValidateUser validates a user model
func ValidateUser(user *models.User) ValidationErrors {
	v := NewValidator()
	
	// Required fields
	v.Required("id", user.ID).
		Required("email", user.Email).
		Required("username", user.Username).
		Required("display_name", user.DisplayName)
	
	// Format validation
	v.Email("email", user.Email).
		Username("username", user.Username)
	
	// Length validation
	v.Range("display_name", user.DisplayName, 1, 50)
	
	// Optional bio validation
	if !utils.IsEmpty(user.Bio) {
		v.MaxLength("bio", user.Bio, 500)
	}
	
	// Stats validation
	if user.Stats != nil {
		v.MinInt("stats.games_played", user.Stats.GamesPlayed, 0).
			MinInt("stats.games_won", user.Stats.GamesWon, 0).
			MinInt("stats.current_streak", user.Stats.CurrentStreak, 0).
			MinInt("stats.longest_streak", user.Stats.LongestStreak, 0).
			RangeInt("stats.elo_rating", user.Stats.ELORating, 800, 3000)
		
		// Win rate validation
		if user.Stats.GamesPlayed > 0 {
			winRate := utils.CalculateWinRate(user.Stats.GamesWon, user.Stats.GamesPlayed)
			if winRate < 0 || winRate > 100 {
				v.AddError("stats.win_rate", "invalid win rate calculation", "invalid_calculation")
			}
		}
	}
	
	return v.GetErrors()
}

// ValidateUserRegistration validates user registration data
func ValidateUserRegistration(email, username, password, displayName string) ValidationErrors {
	v := NewValidator()
	
	v.Required("email", email).
		Required("username", username).
		Required("password", password).
		Required("display_name", displayName)
	
	v.Email("email", email).
		Username("username", username).
		Password("password", password).
		Range("display_name", displayName, 1, 50)
	
	return v.GetErrors()
}

// ValidateUserUpdate validates user update data
func ValidateUserUpdate(displayName, bio string) ValidationErrors {
	v := NewValidator()
	
	if !utils.IsEmpty(displayName) {
		v.Range("display_name", displayName, 1, 50)
	}
	
	if !utils.IsEmpty(bio) {
		v.MaxLength("bio", bio, 500)
	}
	
	return v.GetErrors()
}

// Match Validation

// ValidateMatch validates a match model
func ValidateMatch(match *models.Match) ValidationErrors {
	v := NewValidator()
	
	// Required fields
	v.Required("id", match.ID).
		Required("game_mode", match.GameMode).
		Required("status", match.Status)
	
	// Game mode validation
	validGameModes := []string{"classic", "blitz", "tournament"}
	v.OneOf("game_mode", match.GameMode, validGameModes)
	
	// Status validation
	validStatuses := []string{"waiting", "in_progress", "completed", "cancelled"}
	v.OneOf("status", match.Status, validStatuses)
	
	// Player validation
	if len(match.Players) == 0 {
		v.AddError("players", "at least one player required", "required")
	}
	
	if len(match.Players) > 8 {
		v.AddError("players", "maximum 8 players allowed", "max_players")
	}
	
	// Settings validation
	if match.Settings != nil {
		v.RangeInt("settings.max_players", match.Settings.MaxPlayers, 2, 8).
			RangeInt("settings.turn_time_limit", match.Settings.TurnTimeLimit, 30, 600).
			RangeInt("settings.dice_count", match.Settings.DiceCount, 1, 6).
			RangeInt("settings.dice_sides", match.Settings.DiceSides, 4, 20)
		
		if match.Settings.TargetScore <= 0 {
			v.AddError("settings.target_score", "target score must be positive", "invalid_value")
		}
	}
	
	return v.GetErrors()
}

// ValidateMatchCreation validates match creation data
func ValidateMatchCreation(gameMode string, maxPlayers int, isPrivate bool) ValidationErrors {
	v := NewValidator()
	
	v.Required("game_mode", gameMode)
	
	validGameModes := []string{"classic", "blitz", "tournament"}
	v.OneOf("game_mode", gameMode, validGameModes).
		RangeInt("max_players", maxPlayers, 2, 8)
	
	return v.GetErrors()
}

// Queue Validation

// ValidateQueue validates a queue entry
func ValidateQueue(queue *models.Queue) ValidationErrors {
	v := NewValidator()
	
	v.Required("id", queue.ID).
		Required("user_id", queue.UserID).
		Required("game_mode", queue.GameMode)
	
	validGameModes := []string{"classic", "blitz", "tournament"}
	v.OneOf("game_mode", queue.GameMode, validGameModes)
	
	// Preferences validation
	if queue.Preferences != nil {
		if queue.Preferences.MaxPlayers > 0 {
			v.RangeInt("preferences.max_players", queue.Preferences.MaxPlayers, 2, 8)
		}
		
		if queue.Preferences.MinELO > 0 || queue.Preferences.MaxELO > 0 {
			v.RangeInt("preferences.min_elo", queue.Preferences.MinELO, 800, 3000).
				RangeInt("preferences.max_elo", queue.Preferences.MaxELO, 800, 3000)
			
			if queue.Preferences.MinELO > queue.Preferences.MaxELO {
				v.AddError("preferences.elo_range", "min ELO cannot be greater than max ELO", "invalid_range")
			}
		}
	}
	
	return v.GetErrors()
}

// Notification Validation

// ValidateNotification validates a notification model
func ValidateNotification(notification *models.Notification) ValidationErrors {
	v := NewValidator()
	
	v.Required("id", notification.ID).
		Required("user_id", notification.UserID).
		Required("type", notification.Type).
		Required("title", notification.Title).
		Required("message", notification.Message)
	
	// Type validation
	validTypes := []string{"match_found", "match_completed", "friend_request", "achievement_unlocked", "system"}
	v.OneOf("type", notification.Type, validTypes)
	
	// Length validation
	v.MaxLength("title", notification.Title, 100).
		MaxLength("message", notification.Message, 500)
	
	return v.GetErrors()
}

// Achievement Validation

// ValidateAchievement validates an achievement model
func ValidateAchievement(achievement *models.Achievement) ValidationErrors {
	v := NewValidator()
	
	v.Required("id", achievement.ID).
		Required("name", achievement.Name).
		Required("description", achievement.Description).
		Required("category", achievement.Category)
	
	// Length validation
	v.Range("name", achievement.Name, 1, 50).
		Range("description", achievement.Description, 1, 200)
	
	// Category validation
	validCategories := []string{"games", "social", "skill", "special"}
	v.OneOf("category", achievement.Category, validCategories)
	
	// Points validation
	v.MinInt("points", achievement.Points, 0)
	
	return v.GetErrors()
}

// Tournament Validation

// ValidateTournament validates a tournament model
func ValidateTournament(tournament *models.Tournament) ValidationErrors {
	v := NewValidator()
	
	v.Required("id", tournament.ID).
		Required("name", tournament.Name).
		Required("game_mode", tournament.GameMode).
		Required("status", tournament.Status)
	
	// Length validation
	v.Range("name", tournament.Name, 1, 100)
	
	// Game mode validation
	validGameModes := []string{"classic", "blitz"}
	v.OneOf("game_mode", tournament.GameMode, validGameModes)
	
	// Status validation
	validStatuses := []string{"upcoming", "registration", "in_progress", "completed", "cancelled"}
	v.OneOf("status", tournament.Status, validStatuses)
	
	// Capacity validation
	v.RangeInt("max_participants", tournament.MaxParticipants, 4, 1000)
	
	// Date validation
	if !tournament.StartTime.IsZero() && !tournament.EndTime.IsZero() {
		if tournament.StartTime.After(tournament.EndTime) {
			v.AddError("dates", "start time cannot be after end time", "invalid_range")
		}
		
		if tournament.StartTime.Before(time.Now()) && tournament.Status == "upcoming" {
			v.AddError("start_time", "start time cannot be in the past for upcoming tournaments", "invalid_time")
		}
	}
	
	return v.GetErrors()
}

// Presence Validation

// ValidatePresence validates a presence model
func ValidatePresence(presence *models.Presence) ValidationErrors {
	v := NewValidator()
	
	v.Required("user_id", presence.UserID).
		Required("status", presence.Status)
	
	// Status validation
	validStatuses := []string{"online", "away", "busy", "offline"}
	v.OneOf("status", presence.Status, validStatuses)
	
	// Activity validation
	if !utils.IsEmpty(presence.Activity) {
		validActivities := []string{"menu", "queue", "match", "settings", "profile"}
		v.OneOf("activity", presence.Activity, validActivities)
	}
	
	return v.GetErrors()
}

// Batch Validation

// ValidateUsers validates multiple users
func ValidateUsers(users []*models.User) map[string]ValidationErrors {
	results := make(map[string]ValidationErrors)
	
	for _, user := range users {
		if errors := ValidateUser(user); errors.HasErrors() {
			results[user.ID] = errors
		}
	}
	
	return results
}

// ValidateMatches validates multiple matches
func ValidateMatches(matches []*models.Match) map[string]ValidationErrors {
	results := make(map[string]ValidationErrors)
	
	for _, match := range matches {
		if errors := ValidateMatch(match); errors.HasErrors() {
			results[match.ID] = errors
		}
	}
	
	return results
}

// Validation Helpers

// ValidateID validates that an ID is not empty and has valid format
func ValidateID(id string) error {
	if utils.IsEmpty(id) {
		return ErrRequired
	}
	
	// UUID format validation
	uuidRegex := regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
	if !uuidRegex.MatchString(id) {
		return ErrInvalidFormat
	}
	
	return nil
}

// ValidateEmail validates email format
func ValidateEmail(email string) error {
	if utils.IsEmpty(email) {
		return ErrRequired
	}
	
	if !utils.IsValidEmail(email) {
		return ErrInvalidEmail
	}
	
	return nil
}

// ValidateUsername validates username format
func ValidateUsername(username string) error {
	if utils.IsEmpty(username) {
		return ErrRequired
	}
	
	if !utils.IsValidUsername(username) {
		return ErrInvalidUsername
	}
	
	return nil
}

// ValidatePassword validates password strength
func ValidatePassword(password string) error {
	if utils.IsEmpty(password) {
		return ErrRequired
	}
	
	if !utils.IsStrongPassword(password) {
		return ErrWeakPassword
	}
	
	return nil
}

// ValidatePagination validates pagination parameters
func ValidatePagination(page, limit int) error {
	if page < 1 {
		return fmt.Errorf("page must be at least 1")
	}
	
	if limit < 1 || limit > 100 {
		return fmt.Errorf("limit must be between 1 and 100")
	}
	
	return nil
}

// ValidateGameMode validates game mode
func ValidateGameMode(gameMode string) error {
	validModes := []string{"classic", "blitz", "tournament"}
	if !utils.Contains(validModes, gameMode) {
		return fmt.Errorf("invalid game mode: %s", gameMode)
	}
	
	return nil
}

// ValidateELORange validates ELO range
func ValidateELORange(minELO, maxELO int) error {
	if minELO < 800 || minELO > 3000 {
		return fmt.Errorf("min ELO must be between 800 and 3000")
	}
	
	if maxELO < 800 || maxELO > 3000 {
		return fmt.Errorf("max ELO must be between 800 and 3000")
	}
	
	if minELO > maxELO {
		return fmt.Errorf("min ELO cannot be greater than max ELO")
	}
	
	return nil
}

// Sanitization

// SanitizeUser sanitizes user input
func SanitizeUser(user *models.User) {
	user.Email = strings.TrimSpace(strings.ToLower(user.Email))
	user.Username = strings.TrimSpace(strings.ToLower(user.Username))
	user.DisplayName = utils.SanitizeString(user.DisplayName)
	user.Bio = utils.SanitizeString(user.Bio)
}

// SanitizeMatch sanitizes match input
func SanitizeMatch(match *models.Match) {
	match.GameMode = strings.TrimSpace(strings.ToLower(match.GameMode))
	match.Status = strings.TrimSpace(strings.ToLower(match.Status))
	
	if match.Settings != nil {
		if match.Settings.MaxPlayers <= 0 {
			match.Settings.MaxPlayers = 4
		}
		if match.Settings.TurnTimeLimit <= 0 {
			match.Settings.TurnTimeLimit = 60
		}
		if match.Settings.DiceCount <= 0 {
			match.Settings.DiceCount = 2
		}
		if match.Settings.DiceSides <= 0 {
			match.Settings.DiceSides = 6
		}
		if match.Settings.TargetScore <= 0 {
			match.Settings.TargetScore = 100
		}
	}
}

// SanitizeNotification sanitizes notification input
func SanitizeNotification(notification *models.Notification) {
	notification.Type = strings.TrimSpace(strings.ToLower(notification.Type))
	notification.Title = utils.SanitizeString(notification.Title)
	notification.Message = utils.SanitizeString(notification.Message)
	
	// Truncate if too long
	notification.Title = utils.TruncateString(notification.Title, 100)
	notification.Message = utils.TruncateString(notification.Message, 500)
}
