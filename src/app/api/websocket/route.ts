import { NextRequest } from 'next/server';
import { WebSocketServer, WebSocket } from 'ws';

// WebSocket handler for real-time matchmaking updates
// Provides live notifications for queue status, match found, game updates

interface WebSocketMessage {
  type: 'queue_joined' | 'queue_left' | 'match_found' | 'game_started' | 'game_ended' | 'error' | 'ping';
  user_id?: string;
  match_id?: string;
  data?: any;
  timestamp: string;
}

interface ConnectedClient {
  ws: WebSocket;
  user_id: string;
  connected_at: Date;
  last_ping: Date;
}

class MatchmakingWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeWebSocketServer();
    this.startHeartbeat();
  }

  private initializeWebSocketServer() {
    if (typeof window === 'undefined' && !this.wss) {
      // Server-side WebSocket initialization
      this.wss = new WebSocketServer({ 
        port: parseInt(process.env.WEBSOCKET_PORT || '8085'),
        path: '/ws/matchmaking'
      });

      this.wss.on('connection', (ws: WebSocket, request: any) => {
        this.handleNewConnection(ws, request);
      });

      console.log('WebSocket server initialized on port', process.env.WEBSOCKET_PORT || '8085');
    }
  }

  private handleNewConnection(ws: WebSocket, request: any) {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const userId = url.searchParams.get('user_id');
    
    if (!userId) {
      ws.close(1008, 'Missing user_id parameter');
      return;
    }

    // Store client connection
    const client: ConnectedClient = {
      ws,
      user_id: userId,
      connected_at: new Date(),
      last_ping: new Date()
    };

    this.clients.set(userId, client);

    // Send welcome message
    this.sendMessage(ws, {
      type: 'queue_joined',
      user_id: userId,
      data: { 
        message: 'Connected to real-time matchmaking',
        server_time: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleClientMessage(userId, message);
      } catch (error) {
        console.error('Invalid WebSocket message from', userId, error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    // Handle client disconnection
    ws.on('close', () => {
      this.clients.delete(userId);
      console.log('Client disconnected:', userId);
    });

    // Handle errors
    ws.on('error', (error: any) => {
      console.error('WebSocket error for user', userId, error);
      this.clients.delete(userId);
    });

    console.log('New WebSocket connection:', userId);
  }

  private handleClientMessage(userId: string, message: WebSocketMessage) {
    const client = this.clients.get(userId);
    if (!client) return;

    switch (message.type) {
      case 'ping':
        client.last_ping = new Date();
        this.sendMessage(client.ws, {
          type: 'ping',
          data: { pong: true },
          timestamp: new Date().toISOString()
        });
        break;

      default:
        console.log('Received message from', userId, message);
        // Forward other messages to matchmaking service if needed
        this.forwardToMatchmakingService(userId, message);
        break;
    }
  }

  private async forwardToMatchmakingService(userId: string, message: WebSocketMessage) {
    try {
      // Forward real-time updates to the Go microservices
      const apiGatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:8080';
      
      const response = await fetch(`${apiGatewayUrl}/api/v1/websocket/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          message_type: message.type,
          data: message.data
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Send response back to client if needed
        if (result.broadcast) {
          this.broadcastToUser(userId, {
            type: result.message_type || 'update',
            data: result.data,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error forwarding message to matchmaking service:', error);
    }
  }

  public broadcastToUser(userId: string, message: WebSocketMessage) {
    const client = this.clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      this.sendMessage(client.ws, message);
    }
  }

  public broadcastMatchFound(userIds: string[], matchData: any) {
    const message: WebSocketMessage = {
      type: 'match_found',
      data: matchData,
      timestamp: new Date().toISOString()
    };

    userIds.forEach(userId => {
      this.broadcastToUser(userId, {
        ...message,
        user_id: userId
      });
    });
  }

  public broadcastGameUpdate(matchId: string, gameData: any) {
    // Find all clients in this match and broadcast update
    this.clients.forEach((client, userId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, {
          type: 'game_started',
          match_id: matchId,
          data: gameData,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private sendMessage(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, errorMessage: string) {
    this.sendMessage(ws, {
      type: 'error',
      data: { error: errorMessage },
      timestamp: new Date().toISOString()
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      
      this.clients.forEach((client, userId) => {
        // Check if client has been inactive for too long
        if (now.getTime() - client.last_ping.getTime() > 60000) { // 60 seconds
          console.log('Removing inactive client:', userId);
          client.ws.terminate();
          this.clients.delete(userId);
        }
      });
    }, 30000); // Check every 30 seconds
  }

  public getStats() {
    return {
      connected_clients: this.clients.size,
      server_uptime: process.uptime(),
      clients: Array.from(this.clients.entries()).map(([userId, client]) => ({
        user_id: userId,
        connected_at: client.connected_at,
        last_ping: client.last_ping
      }))
    };
  }

  public shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client) => {
      client.ws.terminate();
    });

    if (this.wss) {
      this.wss.close();
    }
  }
}

// Singleton WebSocket server instance
let wsServer: MatchmakingWebSocketServer | null = null;

export function getWebSocketServer(): MatchmakingWebSocketServer {
  if (!wsServer) {
    wsServer = new MatchmakingWebSocketServer();
  }
  return wsServer;
}

// API endpoint to get WebSocket server stats
export async function GET(request: NextRequest) {
  try {
    const server = getWebSocketServer();
    const stats = server.getStats();

    return new Response(JSON.stringify({
      websocket_server: 'active',
      stats,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('WebSocket stats error:', error);
    
    return new Response(JSON.stringify({
      error: 'WebSocket server unavailable',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

// API endpoint to broadcast messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, user_ids, message_type, data } = body;

    if (!message_type) {
      return new Response(JSON.stringify({
        error: 'Missing message_type'
      }), { status: 400 });
    }

    const server = getWebSocketServer();
    const message: WebSocketMessage = {
      type: message_type,
      data,
      timestamp: new Date().toISOString()
    };

    if (user_ids && Array.isArray(user_ids)) {
      // Broadcast to multiple users
      user_ids.forEach((userId: string) => {
        server.broadcastToUser(userId, { ...message, user_id: userId });
      });
    } else if (user_id) {
      // Broadcast to single user
      server.broadcastToUser(user_id, { ...message, user_id });
    } else {
      return new Response(JSON.stringify({
        error: 'Missing user_id or user_ids'
      }), { status: 400 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Broadcast sent',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('WebSocket broadcast error:', error);
    
    return new Response(JSON.stringify({
      error: 'Broadcast failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
