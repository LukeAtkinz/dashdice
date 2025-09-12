// WebSocket Real-time Communication Client
// Provides real-time matchmaking updates and game notifications

class MatchmakingWebSocketClient {
    constructor(userId, options = {}) {
        this.userId = userId;
        this.wsUrl = options.wsUrl || 'ws://localhost:8085/ws/matchmaking';
        this.autoReconnect = options.autoReconnect !== false;
        this.reconnectInterval = options.reconnectInterval || 5000;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
        
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.eventListeners = new Map();
        this.heartbeatInterval = null;
        
        this.connect();
    }

    connect() {
        try {
            const url = `${this.wsUrl}?user_id=${encodeURIComponent(this.userId)}`;
            this.ws = new WebSocket(url);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected for user:', this.userId);
                this.connected = true;
                this.reconnectAttempts = 0;
                this.startHeartbeat();
                this.emit('connected');
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Invalid WebSocket message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                this.connected = false;
                this.stopHeartbeat();
                this.emit('disconnected', { code: event.code, reason: event.reason });
                
                if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.attemptReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            };

        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.attemptReconnect();
            }
        }
    }

    attemptReconnect() {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            this.connect();
        }, this.reconnectInterval);
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.connected && this.ws.readyState === WebSocket.OPEN) {
                this.send({
                    type: 'ping',
                    timestamp: new Date().toISOString()
                });
            }
        }, 30000); // Send ping every 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    handleMessage(message) {
        console.log('Received WebSocket message:', message);

        switch (message.type) {
            case 'queue_joined':
                this.emit('queueJoined', message.data);
                break;

            case 'queue_left':
                this.emit('queueLeft', message.data);
                break;

            case 'match_found':
                this.emit('matchFound', {
                    matchId: message.match_id,
                    ...message.data
                });
                break;

            case 'game_started':
                this.emit('gameStarted', {
                    matchId: message.match_id,
                    ...message.data
                });
                break;

            case 'game_ended':
                this.emit('gameEnded', {
                    matchId: message.match_id,
                    ...message.data
                });
                break;

            case 'error':
                console.error('WebSocket server error:', message.data);
                this.emit('serverError', message.data);
                break;

            case 'ping':
                // Server responded to our ping, connection is healthy
                break;

            default:
                console.log('Unknown message type:', message.type);
                this.emit('message', message);
                break;
        }
    }

    send(message) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                ...message,
                user_id: this.userId,
                timestamp: new Date().toISOString()
            }));
            return true;
        } else {
            console.warn('WebSocket not connected, message not sent:', message);
            return false;
        }
    }

    // Event listener management
    on(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }

    off(eventType, callback) {
        if (this.eventListeners.has(eventType)) {
            const listeners = this.eventListeners.get(eventType);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(eventType, data) {
        if (this.eventListeners.has(eventType)) {
            this.eventListeners.get(eventType).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        }
    }

    // Matchmaking-specific methods
    joinQueue(gameMode, preferences = {}) {
        return this.send({
            type: 'join_queue',
            data: {
                game_mode: gameMode,
                preferences
            }
        });
    }

    leaveQueue() {
        return this.send({
            type: 'leave_queue'
        });
    }

    updatePreferences(preferences) {
        return this.send({
            type: 'update_preferences',
            data: preferences
        });
    }

    // Connection management
    disconnect() {
        this.autoReconnect = false;
        this.stopHeartbeat();
        
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
        }
        
        this.connected = false;
        this.emit('disconnected', { code: 1000, reason: 'Client disconnect' });
    }

    // Get connection status
    isConnected() {
        return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    getConnectionState() {
        if (!this.ws) return 'disconnected';
        
        switch (this.ws.readyState) {
            case WebSocket.CONNECTING: return 'connecting';
            case WebSocket.OPEN: return 'connected';
            case WebSocket.CLOSING: return 'closing';
            case WebSocket.CLOSED: return 'closed';
            default: return 'unknown';
        }
    }
}

// React Hook for WebSocket Integration
function useMatchmakingWebSocket(userId, options = {}) {
    const [client, setClient] = useState(null);
    const [connected, setConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const [connectionState, setConnectionState] = useState('disconnected');

    useEffect(() => {
        if (!userId) return;

        const wsClient = new MatchmakingWebSocketClient(userId, options);

        // Set up event listeners
        wsClient.on('connected', () => {
            setConnected(true);
            setConnectionState('connected');
        });

        wsClient.on('disconnected', (data) => {
            setConnected(false);
            setConnectionState('disconnected');
        });

        wsClient.on('message', (message) => {
            setLastMessage(message);
        });

        wsClient.on('matchFound', (data) => {
            setLastMessage({ type: 'matchFound', data });
        });

        wsClient.on('gameStarted', (data) => {
            setLastMessage({ type: 'gameStarted', data });
        });

        wsClient.on('queueJoined', (data) => {
            setLastMessage({ type: 'queueJoined', data });
        });

        wsClient.on('error', () => {
            setConnectionState('error');
        });

        setClient(wsClient);

        // Cleanup on unmount
        return () => {
            wsClient.disconnect();
        };
    }, [userId]);

    const sendMessage = useCallback((message) => {
        if (client) {
            return client.send(message);
        }
        return false;
    }, [client]);

    const joinQueue = useCallback((gameMode, preferences = {}) => {
        if (client) {
            return client.joinQueue(gameMode, preferences);
        }
        return false;
    }, [client]);

    const leaveQueue = useCallback(() => {
        if (client) {
            return client.leaveQueue();
        }
        return false;
    }, [client]);

    return {
        client,
        connected,
        lastMessage,
        connectionState,
        sendMessage,
        joinQueue,
        leaveQueue,
        isConnected: client?.isConnected() || false
    };
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MatchmakingWebSocketClient, useMatchmakingWebSocket };
} else if (typeof window !== 'undefined') {
    window.MatchmakingWebSocketClient = MatchmakingWebSocketClient;
    window.useMatchmakingWebSocket = useMatchmakingWebSocket;
}
