# WebSocket Server Configuration for Real-time Matchmaking

## Overview
This WebSocket server provides real-time communication for the DashDice matchmaking system, enabling live updates for queue status, match notifications, and game state synchronization.

## Features

### Core Functionality
- **Real-time Match Updates**: Live notifications when matches are found
- **Queue Status**: Real-time updates on matchmaking queue position
- **Game State Sync**: Live game state updates during matches
- **Connection Management**: Automatic client cleanup and heartbeat monitoring
- **Message Broadcasting**: Support for individual and group message delivery

### Message Types
1. **queue_joined**: User connected to matchmaking
2. **queue_left**: User disconnected from queue
3. **match_found**: Match has been created for user(s)
4. **game_started**: Game session has begun
5. **game_ended**: Game session completed
6. **error**: Error notification
7. **ping**: Heartbeat/keepalive message

## Configuration

### Environment Variables
```bash
WEBSOCKET_PORT=8085                    # WebSocket server port
API_GATEWAY_URL=http://localhost:8080  # Go microservice API gateway
```

### Vercel Integration
The WebSocket server runs on a separate port (8085) and integrates with Vercel serverless functions through API endpoints:
- `GET /api/websocket` - Server statistics
- `POST /api/websocket` - Broadcast messages

## Client Connection

### JavaScript Client Example
```javascript
// Connect to WebSocket server
const ws = new WebSocket('ws://localhost:8085/ws/matchmaking?user_id=your_user_id');

// Handle connection events
ws.onopen = () => {
  console.log('Connected to matchmaking server');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'match_found':
      console.log('Match found!', message.data);
      // Handle match found notification
      break;
      
    case 'queue_joined':
      console.log('Joined matchmaking queue');
      break;
      
    case 'game_started':
      console.log('Game started!', message.data);
      // Redirect to game or update UI
      break;
      
    case 'error':
      console.error('WebSocket error:', message.data.error);
      break;
  }
};

// Send ping to maintain connection
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'ping',
      timestamp: new Date().toISOString()
    }));
  }
}, 30000);
```

### React Hook Example
```typescript
import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  user_id?: string;
  data?: any;
  timestamp: string;
}

export function useMatchmakingWebSocket(userId: string) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Connect to WebSocket
    ws.current = new WebSocket(`ws://localhost:8085/ws/matchmaking?user_id=${userId}`);

    ws.current.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };

    ws.current.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      setLastMessage(message);
    };

    ws.current.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Cleanup on unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [userId]);

  const sendMessage = (message: Partial<WebSocketMessage>) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      }));
    }
  };

  return { connected, lastMessage, sendMessage };
}
```

## Integration with Go Microservices

### Message Forwarding
The WebSocket server forwards client messages to the Go API gateway for processing:
- Queue join/leave requests
- Match preferences updates
- Game state changes

### Broadcasting from Microservices
Go services can trigger WebSocket broadcasts by calling the broadcast API:

```bash
# Broadcast match found to multiple users
curl -X POST http://localhost:3000/api/websocket \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": ["user1", "user2"],
    "message_type": "match_found",
    "data": {
      "match_id": "match_123",
      "game_mode": "classic",
      "players": ["user1", "user2"]
    }
  }'
```

## Security Considerations

### Authentication
- User ID validation through query parameters
- Connection authorization checks
- Message origin verification

### Rate Limiting
- Heartbeat monitoring (60-second timeout)
- Message frequency controls
- Client connection limits

### Error Handling
- Invalid message format protection
- Connection cleanup for failed clients
- Graceful degradation on service errors

## Deployment

### Docker Configuration
Add WebSocket service to docker-compose.yml:
```yaml
services:
  websocket-server:
    build:
      context: .
      dockerfile: Dockerfile.websocket
    ports:
      - "8085:8085"
    environment:
      - WEBSOCKET_PORT=8085
      - API_GATEWAY_URL=http://api-gateway:8080
    depends_on:
      - api-gateway
      - redis
```

### Production Considerations
1. **Load Balancing**: Use sticky sessions for WebSocket connections
2. **Scaling**: Implement Redis pub/sub for multi-instance broadcasting
3. **Monitoring**: Track connection counts and message throughput
4. **SSL/TLS**: Configure secure WebSocket (WSS) for production

## Testing

### Connection Testing
```bash
# Test WebSocket server status
curl http://localhost:3000/api/websocket

# Test broadcast functionality
curl -X POST http://localhost:3000/api/websocket \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test_user", "message_type": "ping", "data": {"test": true}}'
```

### Load Testing
Use the advanced load testing script to validate WebSocket performance:
```powershell
# Run WebSocket load test
.\advanced-load-testing.ps1 -TestType websocket -ConcurrentUsers 50
```

## Troubleshooting

### Common Issues
1. **Connection Refused**: Ensure WebSocket server is running on correct port
2. **Authentication Errors**: Verify user_id parameter in connection URL
3. **Message Delivery**: Check API gateway connectivity and Redis status

### Debug Commands
```bash
# Check WebSocket server status
curl -s http://localhost:3000/api/websocket | jq

# Monitor server logs
docker logs dashdice-websocket-server-1 -f

# Test direct WebSocket connection
wscat -c "ws://localhost:8085/ws/matchmaking?user_id=debug_user"
```
