import { NextRequest, NextResponse } from 'next/server';

// System health monitoring endpoint for Vercel deployment
// Checks all microservices and provides comprehensive status







interface ServiceStatus {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unreachable';
  response_time?: number;
  last_check: string;
  details?: any;
}

interface SystemHealthResponse {
  overall_status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  deployment: string;
  services: ServiceStatus[];
  redis_status: {
    connected: boolean;
    response_time?: number;
    error?: string;
  };
  version: string;
  uptime: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const services = [
      {
        name: 'API Gateway',
        url: process.env.API_GATEWAY_URL || 'http://localhost:8080',
        endpoint: '/health'
      },
      {
        name: 'Match Service',
        url: process.env.MATCH_SERVICE_URL || 'http://localhost:8081',
        endpoint: '/health'
      },
      {
        name: 'Queue Service',
        url: process.env.QUEUE_SERVICE_URL || 'http://localhost:8082',
        endpoint: '/health'
      },
      {
        name: 'Notification Service',
        url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8083',
        endpoint: '/health'
      }
    ];
    
    // Check all services in parallel
    const serviceChecks = await Promise.allSettled(
      services.map(async (service): Promise<ServiceStatus> => {
        const checkStart = Date.now();
        
        try {
          const response = await fetch(`${service.url}${service.endpoint}`, {
            method: 'GET',
            headers: {
              'User-Agent': 'DashDice-Health-Check/1.0',
            },
            signal: AbortSignal.timeout(5000) // 5 second timeout
          });
          
          const responseTime = Date.now() - checkStart;
          
          if (response.ok) {
            const details = await response.json();
            return {
              name: service.name,
              url: service.url,
              status: 'healthy',
              response_time: responseTime,
              last_check: new Date().toISOString(),
              details
            };
          } else {
            return {
              name: service.name,
              url: service.url,
              status: 'unhealthy',
              response_time: responseTime,
              last_check: new Date().toISOString(),
              details: { status_code: response.status }
            };
          }
        } catch (error) {
          return {
            name: service.name,
            url: service.url,
            status: 'unreachable',
            last_check: new Date().toISOString(),
            details: { 
              error: error instanceof Error ? error.message : 'Unknown error' 
            }
          };
        }
      })
    );
    
    // Process service check results
    const serviceStatuses: ServiceStatus[] = serviceChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: services[index].name,
          url: services[index].url,
          status: 'unreachable',
          last_check: new Date().toISOString(),
          details: { error: 'Health check failed' }
        };
      }
    });
    
    // Check Redis status (if URL is provided)
    let redisStatus: {
      connected: boolean;
      response_time?: number;
      error?: string;
    } = {
      connected: false,
      error: 'Redis URL not configured'
    };
    
    if (process.env.REDIS_URL) {
      try {
        // For Vercel, we'll need to use a Redis client
        // This is a placeholder - in production you'd use a proper Redis client
        const redisCheckStart = Date.now();
        redisStatus = {
          connected: true,
          response_time: Date.now() - redisCheckStart
        };
      } catch (error) {
        redisStatus = {
          connected: false,
          error: error instanceof Error ? error.message : 'Redis connection failed'
        };
      }
    }
    
    // Determine overall system status
    const healthyServices = serviceStatuses.filter(s => s.status === 'healthy').length;
    const totalServices = serviceStatuses.length;
    
    let overallStatus: 'healthy' | 'degraded' | 'critical';
    
    if (healthyServices === totalServices && redisStatus.connected) {
      overallStatus = 'healthy';
    } else if (healthyServices >= totalServices * 0.5) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'critical';
    }
    
    const healthResponse: SystemHealthResponse = {
      overall_status: overallStatus,
      timestamp: new Date().toISOString(),
      deployment: 'vercel',
      services: serviceStatuses,
      redis_status: redisStatus,
      version: '2.0.0',
      uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'unknown'
    };
    
    const responseTime = Date.now() - startTime;
    
    // Set appropriate HTTP status based on overall health
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 207 : 503;
    
    return new NextResponse(JSON.stringify(healthResponse), {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
        'X-Response-Time': `${responseTime}ms`,
        'Access-Control-Allow-Origin': '*',
      }
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        overall_status: 'critical',
        timestamp: new Date().toISOString(),
        deployment: 'vercel',
        error: 'Health check system failure',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
