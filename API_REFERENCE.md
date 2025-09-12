# DashDice Matchmaking System - API Reference

## 🔌 API Endpoints

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user with Firebase token.

**Request:**
```json
{
  "firebase_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "user_id": "user_123",
  "session_token": "session_token_here",
  "expires_at": "2024-01-01T00:00:00Z"
}
```

#### POST /api/auth/logout
Logout and invalidate session.

**Headers:** `Authorization: Bearer session_token`

**Response:**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

### Matchmaking Endpoints

#### POST /api/matchmaking/join
Join matchmaking queue.

**Headers:** `Authorization: Bearer session_token`

**Request:**
```json
{
  "game_mode": "classic",
  "max_players": 2,
  "preferences": {
    "skill_level": "intermediate",
    "region": "us-west",
    "time_limit": 300
  }
}
```

**Response:**
```json
{
  "success": true,
  "queue_id": "queue_123",
  "position": 5,
  "estimated_wait": 30
}
```

#### DELETE /api/matchmaking/leave
Leave matchmaking queue.

**Headers:** `Authorization: Bearer session_token`

**Response:**
```json
{
  "success": true,
  "message": "Left matchmaking queue"
}
```

#### GET /api/matchmaking/status
Get current matchmaking status.

**Headers:** `Authorization: Bearer session_token`

**Response:**
```json
{
  "in_queue": true,
  "queue_id": "queue_123",
  "position": 3,
  "estimated_wait": 15,
  "preferences": {
    "game_mode": "classic",
    "max_players": 2
  }
}
```

### Match Endpoints

#### GET /api/matches/current
Get current active match.

**Headers:** `Authorization: Bearer session_token`

**Response:**
```json
{
  "match_id": "match_456",
  "status": "in_progress",
  "players": [
    {
      "user_id": "user_123",
      "username": "Player1",
      "ready": true
    },
    {
      "user_id": "user_456", 
      "username": "Player2",
      "ready": false
    }
  ],
  "game_mode": "classic",
  "created_at": "2024-01-01T12:00:00Z",
  "server_url": "game-server-1.dashdice.com"
}
```

#### POST /api/matches/{match_id}/ready
Mark player as ready for match.

**Headers:** `Authorization: Bearer session_token`

**Response:**
```json
{
  "success": true,
  "all_players_ready": false,
  "ready_count": 1,
  "total_players": 2
}
```

#### GET /api/matches/history
Get match history for user.

**Headers:** `Authorization: Bearer session_token`

**Query Parameters:**
- `limit` (optional): Number of matches to return (default: 10)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "matches": [
    {
      "match_id": "match_456",
      "game_mode": "classic",
      "result": "win",
      "opponent": "Player2",
      "duration": 180,
      "completed_at": "2024-01-01T12:05:00Z"
    }
  ],
  "total_count": 25,
  "has_more": true
}
```

### WebSocket API

#### Connection
Connect to WebSocket for real-time updates.

**URL:** `ws://localhost:8085/ws/matchmaking?user_id={user_id}`

**Authentication:** Include user_id in query parameters

#### Message Types

##### Client → Server Messages

**Join Queue:**
```json
{
  "type": "join_queue",
  "data": {
    "game_mode": "classic",
    "preferences": {
      "skill_level": "intermediate"
    }
  }
}
```

**Leave Queue:**
```json
{
  "type": "leave_queue"
}
```

**Ping (Heartbeat):**
```json
{
  "type": "ping",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

##### Server → Client Messages

**Queue Joined:**
```json
{
  "type": "queue_joined",
  "user_id": "user_123",
  "data": {
    "queue_id": "queue_123",
    "position": 5,
    "estimated_wait": 30
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Match Found:**
```json
{
  "type": "match_found",
  "user_id": "user_123",
  "match_id": "match_456",
  "data": {
    "opponent_id": "user_789",
    "game_mode": "classic",
    "server_url": "game-server-1.dashdice.com"
  },
  "timestamp": "2024-01-01T12:01:00Z"
}
```

**Game Started:**
```json
{
  "type": "game_started", 
  "match_id": "match_456",
  "data": {
    "game_session_id": "session_789",
    "all_players_ready": true
  },
  "timestamp": "2024-01-01T12:02:00Z"
}
```

### Health Check Endpoints

#### GET /health
System health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "services": {
    "redis": {
      "status": "healthy",
      "response_time": 5
    },
    "postgres": {
      "status": "healthy", 
      "response_time": 12
    },
    "match_service": {
      "status": "healthy",
      "response_time": 8
    }
  }
}
```

#### GET /api/websocket
WebSocket server status.

**Response:**
```json
{
  "websocket_server": "active",
  "stats": {
    "connected_clients": 150,
    "server_uptime": 86400
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## 🔐 Authentication & Authorization

### Firebase Token Validation
All API endpoints require valid Firebase authentication token in Authorization header:
```
Authorization: Bearer <firebase_token>
```

### Session Management
After successful authentication, a session token is provided:
```
Authorization: Bearer <session_token>  
```

### Rate Limiting
- **Standard Endpoints**: 100 requests/minute per user
- **WebSocket Connections**: 5 connections per user
- **Authentication**: 10 login attempts per minute per IP

## 📊 Response Codes

### Success Codes
- `200` - OK: Request successful
- `201` - Created: Resource created successfully
- `204` - No Content: Request successful, no response body

### Client Error Codes
- `400` - Bad Request: Invalid request format
- `401` - Unauthorized: Authentication required
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource not found
- `409` - Conflict: Resource already exists
- `429` - Too Many Requests: Rate limit exceeded

### Server Error Codes
- `500` - Internal Server Error: Unexpected server error
- `502` - Bad Gateway: Service unavailable
- `503` - Service Unavailable: Server overloaded
- `504` - Gateway Timeout: Request timeout

## 🔄 Error Handling

### Standard Error Response
```json
{
  "error": true,
  "error_code": "INVALID_REQUEST",
  "message": "The request format is invalid",
  "details": {
    "field": "game_mode",
    "issue": "must be one of: classic, blitz, tournament"
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "request_id": "req_123456"
}
```

### Error Codes
- `INVALID_REQUEST` - Request format is invalid
- `AUTHENTICATION_FAILED` - Invalid or expired token
- `USER_NOT_FOUND` - User does not exist
- `ALREADY_IN_QUEUE` - User already in matchmaking queue
- `NOT_IN_QUEUE` - User not in matchmaking queue
- `MATCH_NOT_FOUND` - Match does not exist
- `GAME_MODE_INVALID` - Invalid game mode specified
- `SERVICE_UNAVAILABLE` - Backend service unavailable
- `RATE_LIMIT_EXCEEDED` - Too many requests

## 📝 Data Models

### User
```json
{
  "user_id": "string",
  "username": "string", 
  "email": "string",
  "created_at": "datetime",
  "last_active": "datetime",
  "stats": {
    "matches_played": "integer",
    "matches_won": "integer",
    "win_rate": "float",
    "average_game_time": "integer"
  }
}
```

### Match
```json
{
  "match_id": "string",
  "game_mode": "string",
  "status": "waiting|in_progress|completed|cancelled", 
  "players": ["user_id"],
  "created_at": "datetime",
  "started_at": "datetime",
  "completed_at": "datetime",
  "result": {
    "winner": "user_id",
    "duration": "integer",
    "reason": "normal|forfeit|timeout"
  }
}
```

### Queue Entry
```json
{
  "queue_id": "string",
  "user_id": "string", 
  "game_mode": "string",
  "preferences": {
    "skill_level": "beginner|intermediate|advanced|expert",
    "max_players": "integer",
    "region": "string",
    "time_limit": "integer"
  },
  "joined_at": "datetime",
  "position": "integer",
  "estimated_wait": "integer"
}
```

## 🧪 Testing Examples

### cURL Examples

#### Join Matchmaking
```bash
curl -X POST http://localhost:8080/api/matchmaking/join \
  -H "Authorization: Bearer your_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "game_mode": "classic",
    "max_players": 2,
    "preferences": {
      "skill_level": "intermediate"
    }
  }'
```

#### Get Match Status
```bash
curl -X GET http://localhost:8080/api/matchmaking/status \
  -H "Authorization: Bearer your_token_here"
```

#### WebSocket Connection Test
```javascript
const ws = new WebSocket('ws://localhost:8085/ws/matchmaking?user_id=test_user');

ws.onopen = () => {
  console.log('Connected to WebSocket');
  
  // Join queue
  ws.send(JSON.stringify({
    type: 'join_queue',
    data: {
      game_mode: 'classic',
      preferences: {
        skill_level: 'intermediate'
      }
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
  
  if (message.type === 'match_found') {
    console.log('Match found!', message.data);
  }
};
```

### SDK Examples

#### JavaScript/TypeScript
```typescript
import { DashDiceAPI } from '@dashdice/api';

const client = new DashDiceAPI({
  apiUrl: 'http://localhost:8080',
  token: 'your_firebase_token'
});

// Join matchmaking
const result = await client.matchmaking.join({
  gameMode: 'classic',
  maxPlayers: 2,
  preferences: {
    skillLevel: 'intermediate'
  }
});

// Listen for real-time updates
client.websocket.on('matchFound', (data) => {
  console.log('Match found:', data);
});
```

#### Python
```python
import dashdice

client = dashdice.Client(
    api_url='http://localhost:8080',
    token='your_firebase_token'
)

# Join matchmaking
result = client.matchmaking.join(
    game_mode='classic',
    max_players=2,
    preferences={'skill_level': 'intermediate'}
)

# WebSocket connection
@client.websocket.on('match_found')
def on_match_found(data):
    print(f"Match found: {data}")

client.websocket.connect()
```

## 🔧 Configuration Options

### Environment Variables
- `API_GATEWAY_URL` - API Gateway base URL
- `WEBSOCKET_PORT` - WebSocket server port (default: 8085)
- `REDIS_URL` - Redis connection string
- `FIREBASE_PROJECT_ID` - Firebase project identifier
- `MATCH_TIMEOUT` - Match timeout in seconds (default: 300)
- `QUEUE_TIMEOUT` - Queue timeout in seconds (default: 600)

### Game Modes
- `classic` - Standard 2-player match
- `blitz` - Fast-paced 2-player match (3 minutes)
- `tournament` - Tournament bracket match (4-8 players)
- `practice` - Practice mode against AI

### Skill Levels
- `beginner` - New players
- `intermediate` - Moderate experience  
- `advanced` - High skill level
- `expert` - Professional level

### Regions
- `us-west` - US West Coast
- `us-east` - US East Coast  
- `eu-west` - Europe West
- `eu-east` - Europe East
- `asia-pacific` - Asia Pacific

---

**API Version**: 1.0.0  
**Last Updated**: $(Get-Date -Format "yyyy-MM-dd")  
**Base URL**: https://api.dashdice.com
