import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  authenticated: boolean;
}

interface MatchMessage {
  type: 'match_update' | 'player_action' | 'game_state' | 'system_message';
  matchId: string;
  userId?: string;
  data: any;
}

class DashDiceWebSocketServer {
  private server: http.Server;
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private matchRooms: Map<string, Set<string>> = new Map();
  
  constructor(port: number = 8090) {
    this.server = http.createServer();
    this.wss = new WebSocketServer({ server: this.server });
    
    this.setupWebSocketHandlers();
    
    this.server.listen(port, () => {
      console.log(`🚀 DashDice WebSocket Server running on port ${port}`);
    });
  }
  
  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws: WebSocket, request: http.IncomingMessage) => {
      console.log('🔌 New WebSocket connection attempt');
      
      const clientId = this.generateClientId();
      const client: ClientConnection = {
        ws,
        userId: '',
        authenticated: false
      };
      
      this.clients.set(clientId, client);
      
      // Set up message handlers
      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('❌ Invalid message format:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });
      
      ws.on('close', () => {
        console.log(`🔌 Client ${clientId} disconnected`);
        this.handleDisconnect(clientId);
      });
      
      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for client ${clientId}:`, error);
        this.handleDisconnect(clientId);
      });
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        message: 'Connected to DashDice WebSocket Server'
      }));
    });
  }
  
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async handleMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    console.log(`📨 Message from ${clientId}:`, message.type);
    
    switch (message.type) {
      case 'authenticate':
        await this.handleAuthentication(clientId, message.token);
        break;
        
      case 'join_match':
        this.handleJoinMatch(clientId, message.matchId);
        break;
        
      case 'leave_match':
        this.handleLeaveMatch(clientId, message.matchId);
        break;
        
      case 'match_action':
        this.handleMatchAction(clientId, message);
        break;
        
      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong' }));
        break;
        
      default:
        console.warn(`⚠️ Unknown message type: ${message.type}`);
    }
  }
  
  private async handleAuthentication(clientId: string, token: string) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    try {
      // In a real implementation, you'd verify the Firebase JWT token
      // For now, we'll do a simple check
      if (!token) {
        throw new Error('No token provided');
      }
      
      // Mock authentication - in real implementation, verify with Firebase
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.user_id) {
        client.userId = decoded.user_id;
        client.authenticated = true;
        
        client.ws.send(JSON.stringify({
          type: 'authenticated',
          userId: client.userId
        }));
        
        console.log(`✅ Client ${clientId} authenticated as ${client.userId}`);
      } else {
        throw new Error('Invalid token');
      }
    } catch (error) {
      console.error(`❌ Authentication failed for ${clientId}:`, error);
      client.ws.send(JSON.stringify({
        type: 'auth_error',
        message: 'Authentication failed'
      }));
    }
  }
  
  private handleJoinMatch(clientId: string, matchId: string) {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      client?.ws.send(JSON.stringify({
        type: 'error',
        message: 'Not authenticated'
      }));
      return;
    }
    
    // Add client to match room
    if (!this.matchRooms.has(matchId)) {
      this.matchRooms.set(matchId, new Set());
    }
    
    this.matchRooms.get(matchId)!.add(clientId);
    
    client.ws.send(JSON.stringify({
      type: 'joined_match',
      matchId
    }));
    
    // Notify other players in the match
    this.broadcastToMatch(matchId, {
      type: 'player_joined',
      matchId,
      userId: client.userId
    }, clientId);
    
    console.log(`🎮 Client ${clientId} (${client.userId}) joined match ${matchId}`);
  }
  
  private handleLeaveMatch(clientId: string, matchId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    const matchRoom = this.matchRooms.get(matchId);
    if (matchRoom) {
      matchRoom.delete(clientId);
      
      if (matchRoom.size === 0) {
        this.matchRooms.delete(matchId);
      } else {
        // Notify remaining players
        this.broadcastToMatch(matchId, {
          type: 'player_left',
          matchId,
          userId: client.userId
        });
      }
    }
    
    console.log(`🚪 Client ${clientId} (${client.userId}) left match ${matchId}`);
  }
  
  private handleMatchAction(clientId: string, message: MatchMessage) {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) return;
    
    // Broadcast the action to other players in the match
    this.broadcastToMatch(message.matchId, {
      type: 'match_update',
      matchId: message.matchId,
      userId: client.userId,
      action: message.data
    }, clientId);
    
    console.log(`🎯 Match action from ${client.userId} in match ${message.matchId}`);
  }
  
  private broadcastToMatch(matchId: string, message: any, excludeClientId?: string) {
    const matchRoom = this.matchRooms.get(matchId);
    if (!matchRoom) return;
    
    const messageStr = JSON.stringify(message);
    
    matchRoom.forEach(clientId => {
      if (clientId === excludeClientId) return;
      
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }
  
  private handleDisconnect(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // Remove from all match rooms
    this.matchRooms.forEach((room, matchId) => {
      if (room.has(clientId)) {
        room.delete(clientId);
        if (room.size === 0) {
          this.matchRooms.delete(matchId);
        } else {
          this.broadcastToMatch(matchId, {
            type: 'player_disconnected',
            matchId,
            userId: client.userId
          });
        }
      }
    });
    
    // Remove client
    this.clients.delete(clientId);
  }
  
  // Health check endpoint
  public getStatus() {
    return {
      status: 'healthy',
      connections: this.clients.size,
      matches: this.matchRooms.size,
      timestamp: new Date().toISOString()
    };
  }
}

// Start the server
const port = parseInt(process.env.WS_PORT || '8090');
const wsServer = new DashDiceWebSocketServer(port);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down WebSocket server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down WebSocket server...');
  process.exit(0);
});

export default wsServer;
