package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
	
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
	
	"github.com/LukeAtkinz/dashdice/go-services/shared/database"
	"github.com/LukeAtkinz/dashdice/go-services/shared/models"
	"github.com/LukeAtkinz/dashdice/go-services/shared/utils"
)

// WebSocketManager manages all WebSocket connections
type WebSocketManager struct {
	logger    *zap.Logger
	dbManager database.DatabaseManager
	
	// Connection management
	connections   map[string]*WebSocketConnection // userID -> connection
	connMutex     sync.RWMutex
	
	// Room management
	rooms         map[string]*Room // roomID -> room
	roomMutex     sync.RWMutex
	
	// Message broadcasting
	broadcast     chan *BroadcastMessage
	
	// Connection handling
	upgrader      websocket.Upgrader
	
	// Control channels
	stopChan      chan bool
	running       bool
}

// WebSocketConnection represents a single WebSocket connection
type WebSocketConnection struct {
	ID        string
	UserID    string
	User      *models.User
	Conn      *websocket.Conn
	Send      chan []byte
	Rooms     map[string]bool // roomID -> joined
	
	// Connection metadata
	ConnectedAt time.Time
	LastPing    time.Time
	ClientInfo  *ClientInfo
	
	// Control
	closeChan   chan bool
}

// Room represents a group of connected users (e.g., match room, lobby)
type Room struct {
	ID          string
	Type        string // "match", "lobby", "general"
	Connections map[string]*WebSocketConnection // userID -> connection
	Metadata    map[string]interface{}
	CreatedAt   time.Time
	LastActivity time.Time
	mutex       sync.RWMutex
}

// BroadcastMessage represents a message to be broadcast
type BroadcastMessage struct {
	Type      string                 `json:"type"`
	Target    string                 `json:"target"`    // "all", "user", "room"
	TargetID  string                 `json:"target_id"` // userID or roomID
	Message   map[string]interface{} `json:"message"`
	Timestamp time.Time              `json:"timestamp"`
}

// ClientInfo contains client connection information
type ClientInfo struct {
	UserAgent  string `json:"user_agent"`
	IPAddress  string `json:"ip_address"`
	Platform   string `json:"platform"`
	Version    string `json:"version"`
}

// NewWebSocketManager creates a new WebSocket manager
func NewWebSocketManager(logger *zap.Logger, dbManager database.DatabaseManager) *WebSocketManager {
	return &WebSocketManager{
		logger:      logger,
		dbManager:   dbManager,
		connections: make(map[string]*WebSocketConnection),
		rooms:       make(map[string]*Room),
		broadcast:   make(chan *BroadcastMessage, 1000),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				// In production, implement proper origin checking
				return true
			},
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
		stopChan: make(chan bool),
		running:  false,
	}
}

// Start starts the WebSocket manager
func (wsm *WebSocketManager) Start() {
	if wsm.running {
		return
	}
	
	wsm.running = true
	
	// Start broadcast handler
	go wsm.broadcastHandler()
	
	// Start cleanup routine
	go wsm.cleanupRoutine()
	
	wsm.logger.Info("WebSocket manager started")
}

// Stop stops the WebSocket manager
func (wsm *WebSocketManager) Stop() {
	if !wsm.running {
		return
	}
	
	wsm.running = false
	close(wsm.stopChan)
	
	// Close all connections
	wsm.connMutex.Lock()
	for _, conn := range wsm.connections {
		conn.Close()
	}
	wsm.connMutex.Unlock()
	
	wsm.logger.Info("WebSocket manager stopped")
}

// HandleWebSocketUpgrade upgrades HTTP connection to WebSocket
func (wsm *WebSocketManager) HandleWebSocketUpgrade(w http.ResponseWriter, r *http.Request, userID string, user *models.User) error {
	// Upgrade connection
	conn, err := wsm.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return fmt.Errorf("failed to upgrade connection: %w", err)
	}
	
	// Create WebSocket connection
	wsConn := &WebSocketConnection{
		ID:        utils.GenerateID(),
		UserID:    userID,
		User:      user,
		Conn:      conn,
		Send:      make(chan []byte, 256),
		Rooms:     make(map[string]bool),
		ConnectedAt: time.Now(),
		LastPing:  time.Now(),
		ClientInfo: &ClientInfo{
			UserAgent: r.Header.Get("User-Agent"),
			IPAddress: r.RemoteAddr,
			Platform:  r.Header.Get("X-Platform"),
			Version:   r.Header.Get("X-Version"),
		},
		closeChan: make(chan bool),
	}
	
	// Register connection
	wsm.connMutex.Lock()
	// Close existing connection if any
	if existingConn, exists := wsm.connections[userID]; exists {
		existingConn.Close()
	}
	wsm.connections[userID] = wsConn
	wsm.connMutex.Unlock()
	
	// Start connection handlers
	go wsm.readPump(wsConn)
	go wsm.writePump(wsConn)
	
	// Update user presence
	presence := &models.UserPresence{
		UserID:     userID,
		Status:     "online",
		LastSeen:   time.Now(),
		Platform:   wsConn.ClientInfo.Platform,
		InMatch:    false,
		CustomData: make(map[string]interface{}),
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	wsm.dbManager.RealtimeDB().SetPresence(ctx, userID, presence)
	
	// Join general room
	wsm.JoinRoom(userID, "general")
	
	// Send connection success message
	welcomeMsg := map[string]interface{}{
		"type":      "connection",
		"status":    "connected",
		"user_id":   userID,
		"timestamp": time.Now().Unix(),
	}
	wsConn.SendMessage(welcomeMsg)
	
	wsm.logger.Info("WebSocket connection established",
		zap.String("user_id", userID),
		zap.String("connection_id", wsConn.ID),
		zap.String("ip", wsConn.ClientInfo.IPAddress))
	
	return nil
}

// JoinRoom adds a user to a room
func (wsm *WebSocketManager) JoinRoom(userID, roomID string) error {
	wsm.connMutex.RLock()
	conn, exists := wsm.connections[userID]
	wsm.connMutex.RUnlock()
	
	if !exists {
		return fmt.Errorf("user not connected: %s", userID)
	}
	
	// Get or create room
	room := wsm.getOrCreateRoom(roomID, "general")
	
	// Add connection to room
	room.mutex.Lock()
	room.Connections[userID] = conn
	room.LastActivity = time.Now()
	room.mutex.Unlock()
	
	// Add room to connection
	conn.Rooms[roomID] = true
	
	// Notify room members
	joinMsg := map[string]interface{}{
		"type":      "user_joined",
		"user_id":   userID,
		"username":  conn.User.DisplayName,
		"room_id":   roomID,
		"timestamp": time.Now().Unix(),
	}
	
	wsm.BroadcastToRoom(roomID, joinMsg)
	
	wsm.logger.Debug("User joined room",
		zap.String("user_id", userID),
		zap.String("room_id", roomID))
	
	return nil
}

// LeaveRoom removes a user from a room
func (wsm *WebSocketManager) LeaveRoom(userID, roomID string) error {
	wsm.connMutex.RLock()
	conn, exists := wsm.connections[userID]
	wsm.connMutex.RUnlock()
	
	if !exists {
		return fmt.Errorf("user not connected: %s", userID)
	}
	
	wsm.roomMutex.RLock()
	room, roomExists := wsm.rooms[roomID]
	wsm.roomMutex.RUnlock()
	
	if !roomExists {
		return fmt.Errorf("room not found: %s", roomID)
	}
	
	// Remove connection from room
	room.mutex.Lock()
	delete(room.Connections, userID)
	room.LastActivity = time.Now()
	room.mutex.Unlock()
	
	// Remove room from connection
	delete(conn.Rooms, roomID)
	
	// Notify room members
	leaveMsg := map[string]interface{}{
		"type":      "user_left",
		"user_id":   userID,
		"username":  conn.User.DisplayName,
		"room_id":   roomID,
		"timestamp": time.Now().Unix(),
	}
	
	wsm.BroadcastToRoom(roomID, leaveMsg)
	
	wsm.logger.Debug("User left room",
		zap.String("user_id", userID),
		zap.String("room_id", roomID))
	
	return nil
}

// BroadcastToAll sends a message to all connected users
func (wsm *WebSocketManager) BroadcastToAll(message map[string]interface{}) {
	broadcastMsg := &BroadcastMessage{
		Type:      "all",
		Target:    "all",
		Message:   message,
		Timestamp: time.Now(),
	}
	
	select {
	case wsm.broadcast <- broadcastMsg:
	default:
		wsm.logger.Warn("Broadcast channel full, dropping message")
	}
}

// BroadcastToUser sends a message to a specific user
func (wsm *WebSocketManager) BroadcastToUser(userID string, message map[string]interface{}) {
	broadcastMsg := &BroadcastMessage{
		Type:      "user",
		Target:    "user",
		TargetID:  userID,
		Message:   message,
		Timestamp: time.Now(),
	}
	
	select {
	case wsm.broadcast <- broadcastMsg:
	default:
		wsm.logger.Warn("Broadcast channel full, dropping message")
	}
}

// BroadcastToRoom sends a message to all users in a room
func (wsm *WebSocketManager) BroadcastToRoom(roomID string, message map[string]interface{}) {
	broadcastMsg := &BroadcastMessage{
		Type:      "room",
		Target:    "room",
		TargetID:  roomID,
		Message:   message,
		Timestamp: time.Now(),
	}
	
	select {
	case wsm.broadcast <- broadcastMsg:
	default:
		wsm.logger.Warn("Broadcast channel full, dropping message")
	}
}

// GetStats returns WebSocket connection statistics
func (wsm *WebSocketManager) GetStats() *WebSocketStats {
	wsm.connMutex.RLock()
	totalConnections := len(wsm.connections)
	wsm.connMutex.RUnlock()
	
	wsm.roomMutex.RLock()
	totalRooms := len(wsm.rooms)
	roomStats := make(map[string]int)
	for roomID, room := range wsm.rooms {
		room.mutex.RLock()
		roomStats[roomID] = len(room.Connections)
		room.mutex.RUnlock()
	}
	wsm.roomMutex.RUnlock()
	
	return &WebSocketStats{
		TotalConnections: totalConnections,
		TotalRooms:      totalRooms,
		RoomStats:       roomStats,
		Timestamp:       time.Now(),
	}
}

// Private methods

// readPump handles incoming messages from WebSocket
func (wsm *WebSocketManager) readPump(conn *WebSocketConnection) {
	defer func() {
		wsm.removeConnection(conn)
		conn.Conn.Close()
	}()
	
	// Set read limits and timeouts
	conn.Conn.SetReadLimit(512)
	conn.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.Conn.SetPongHandler(func(string) error {
		conn.LastPing = time.Now()
		conn.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	
	for {
		_, messageBytes, err := conn.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				wsm.logger.Error("WebSocket read error", 
					zap.String("user_id", conn.UserID), 
					zap.Error(err))
			}
			break
		}
		
		// Parse message
		var message map[string]interface{}
		if err := json.Unmarshal(messageBytes, &message); err != nil {
			wsm.logger.Warn("Invalid JSON message", 
				zap.String("user_id", conn.UserID), 
				zap.Error(err))
			continue
		}
		
		// Handle message
		wsm.handleIncomingMessage(conn, message)
	}
}

// writePump handles outgoing messages to WebSocket
func (wsm *WebSocketManager) writePump(conn *WebSocketConnection) {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		conn.Conn.Close()
	}()
	
	for {
		select {
		case message, ok := <-conn.Send:
			conn.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				conn.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			
			if err := conn.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				wsm.logger.Error("WebSocket write error", 
					zap.String("user_id", conn.UserID), 
					zap.Error(err))
				return
			}
			
		case <-ticker.C:
			conn.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := conn.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
			
		case <-conn.closeChan:
			return
		}
	}
}

// handleIncomingMessage processes incoming WebSocket messages
func (wsm *WebSocketManager) handleIncomingMessage(conn *WebSocketConnection, message map[string]interface{}) {
	messageType, ok := message["type"].(string)
	if !ok {
		wsm.logger.Warn("Message missing type field", zap.String("user_id", conn.UserID))
		return
	}
	
	switch messageType {
	case "ping":
		wsm.handlePing(conn, message)
	case "join_room":
		wsm.handleJoinRoom(conn, message)
	case "leave_room":
		wsm.handleLeaveRoom(conn, message)
	case "chat":
		wsm.handleChat(conn, message)
	case "game_action":
		wsm.handleGameAction(conn, message)
	default:
		wsm.logger.Debug("Unknown message type", 
			zap.String("user_id", conn.UserID),
			zap.String("type", messageType))
	}
}

// Message handlers
func (wsm *WebSocketManager) handlePing(conn *WebSocketConnection, message map[string]interface{}) {
	pongMsg := map[string]interface{}{
		"type":      "pong",
		"timestamp": time.Now().Unix(),
	}
	conn.SendMessage(pongMsg)
}

func (wsm *WebSocketManager) handleJoinRoom(conn *WebSocketConnection, message map[string]interface{}) {
	roomID, ok := message["room_id"].(string)
	if !ok {
		return
	}
	
	wsm.JoinRoom(conn.UserID, roomID)
}

func (wsm *WebSocketManager) handleLeaveRoom(conn *WebSocketConnection, message map[string]interface{}) {
	roomID, ok := message["room_id"].(string)
	if !ok {
		return
	}
	
	wsm.LeaveRoom(conn.UserID, roomID)
}

func (wsm *WebSocketManager) handleChat(conn *WebSocketConnection, message map[string]interface{}) {
	roomID, ok := message["room_id"].(string)
	if !ok {
		return
	}
	
	content, ok := message["content"].(string)
	if !ok {
		return
	}
	
	// Create chat message
	chatMsg := map[string]interface{}{
		"type":      "chat",
		"user_id":   conn.UserID,
		"username":  conn.User.DisplayName,
		"content":   content,
		"room_id":   roomID,
		"timestamp": time.Now().Unix(),
	}
	
	// Broadcast to room
	wsm.BroadcastToRoom(roomID, chatMsg)
	
	// Store in database if needed
	// This could be implemented to store chat history
}

func (wsm *WebSocketManager) handleGameAction(conn *WebSocketConnection, message map[string]interface{}) {
	// Forward game actions to the Match Service
	wsm.logger.Debug("Game action received", 
		zap.String("user_id", conn.UserID),
		zap.Any("action", message))
	
	// This would typically forward to the Match Service via HTTP or message queue
}

// broadcastHandler processes broadcast messages
func (wsm *WebSocketManager) broadcastHandler() {
	for {
		select {
		case msg := <-wsm.broadcast:
			switch msg.Target {
			case "all":
				wsm.broadcastToAll(msg.Message)
			case "user":
				wsm.broadcastToUser(msg.TargetID, msg.Message)
			case "room":
				wsm.broadcastToRoom(msg.TargetID, msg.Message)
			}
		case <-wsm.stopChan:
			return
		}
	}
}

func (wsm *WebSocketManager) broadcastToAll(message map[string]interface{}) {
	wsm.connMutex.RLock()
	defer wsm.connMutex.RUnlock()
	
	for _, conn := range wsm.connections {
		conn.SendMessage(message)
	}
}

func (wsm *WebSocketManager) broadcastToUser(userID string, message map[string]interface{}) {
	wsm.connMutex.RLock()
	conn, exists := wsm.connections[userID]
	wsm.connMutex.RUnlock()
	
	if exists {
		conn.SendMessage(message)
	}
}

func (wsm *WebSocketManager) broadcastToRoom(roomID string, message map[string]interface{}) {
	wsm.roomMutex.RLock()
	room, exists := wsm.rooms[roomID]
	wsm.roomMutex.RUnlock()
	
	if !exists {
		return
	}
	
	room.mutex.RLock()
	defer room.mutex.RUnlock()
	
	for _, conn := range room.Connections {
		conn.SendMessage(message)
	}
}

// Utility methods
func (wsm *WebSocketManager) getOrCreateRoom(roomID, roomType string) *Room {
	wsm.roomMutex.Lock()
	defer wsm.roomMutex.Unlock()
	
	if room, exists := wsm.rooms[roomID]; exists {
		return room
	}
	
	room := &Room{
		ID:          roomID,
		Type:        roomType,
		Connections: make(map[string]*WebSocketConnection),
		Metadata:    make(map[string]interface{}),
		CreatedAt:   time.Now(),
		LastActivity: time.Now(),
	}
	
	wsm.rooms[roomID] = room
	return room
}

func (wsm *WebSocketManager) removeConnection(conn *WebSocketConnection) {
	// Remove from all rooms
	for roomID := range conn.Rooms {
		wsm.LeaveRoom(conn.UserID, roomID)
	}
	
	// Remove from connections map
	wsm.connMutex.Lock()
	delete(wsm.connections, conn.UserID)
	wsm.connMutex.Unlock()
	
	// Update presence to offline
	presence := &models.UserPresence{
		UserID:     conn.UserID,
		Status:     "offline",
		LastSeen:   time.Now(),
		Platform:   conn.ClientInfo.Platform,
		InMatch:    false,
		CustomData: make(map[string]interface{}),
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	wsm.dbManager.RealtimeDB().SetPresence(ctx, conn.UserID, presence)
	
	wsm.logger.Info("WebSocket connection closed",
		zap.String("user_id", conn.UserID),
		zap.String("connection_id", conn.ID))
}

func (wsm *WebSocketManager) cleanupRoutine() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			wsm.cleanupInactiveRooms()
		case <-wsm.stopChan:
			return
		}
	}
}

func (wsm *WebSocketManager) cleanupInactiveRooms() {
	wsm.roomMutex.Lock()
	defer wsm.roomMutex.Unlock()
	
	for roomID, room := range wsm.rooms {
		room.mutex.RLock()
		connectionCount := len(room.Connections)
		lastActivity := room.LastActivity
		room.mutex.RUnlock()
		
		// Remove rooms with no connections that have been inactive for 10 minutes
		if connectionCount == 0 && time.Since(lastActivity) > 10*time.Minute {
			delete(wsm.rooms, roomID)
			wsm.logger.Debug("Cleaned up inactive room", zap.String("room_id", roomID))
		}
	}
}

// WebSocketConnection methods
func (conn *WebSocketConnection) SendMessage(message map[string]interface{}) {
	messageBytes, err := json.Marshal(message)
	if err != nil {
		return
	}
	
	select {
	case conn.Send <- messageBytes:
	default:
		// Channel is full, close connection
		conn.Close()
	}
}

func (conn *WebSocketConnection) Close() {
	select {
	case conn.closeChan <- true:
	default:
	}
	close(conn.Send)
}

// Data structures for statistics
type WebSocketStats struct {
	TotalConnections int            `json:"total_connections"`
	TotalRooms      int            `json:"total_rooms"`
	RoomStats       map[string]int `json:"room_stats"`
	Timestamp       time.Time      `json:"timestamp"`
}
