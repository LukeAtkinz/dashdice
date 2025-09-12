'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashDiceAPI from '@/services/apiClientNew';

interface ServiceStatus {
  name: string;
  status: 'checking' | 'healthy' | 'error';
  message: string;
  responseTime?: number;
}

export const GoServicesIntegrationTest: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'API Gateway Health', status: 'checking', message: 'Testing connection...' },
    { name: 'Authentication', status: 'checking', message: 'Verifying auth token...' },
    { name: 'User Profile', status: 'checking', message: 'Fetching user data...' },
    { name: 'Queue Service', status: 'checking', message: 'Testing queue status...' },
    { name: 'WebSocket Connection', status: 'checking', message: 'Establishing WebSocket...' },
  ]);

  const [testResults, setTestResults] = useState<any[]>([]);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const updateService = (name: string, status: ServiceStatus['status'], message: string, responseTime?: number) => {
    setServices(prev => prev.map(service => 
      service.name === name ? { ...service, status, message, responseTime } : service
    ));
  };

  const addTestResult = (test: string, success: boolean, data?: any, error?: any) => {
    const result = {
      test,
      success,
      timestamp: new Date().toISOString(),
      data,
      error: error?.message || error,
    };
    setTestResults(prev => [...prev, result]);
  };

  const runIntegrationTests = async () => {
    if (!user) {
      updateService('Authentication', 'error', 'No user logged in');
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: Health Check
      const healthStart = Date.now();
      try {
        const isHealthy = await DashDiceAPI.healthCheck();
        const healthTime = Date.now() - healthStart;
        
        if (isHealthy) {
          updateService('API Gateway Health', 'healthy', `Connected (${healthTime}ms)`, healthTime);
          addTestResult('Health Check', true, { responseTime: healthTime });
        } else {
          updateService('API Gateway Health', 'error', 'Service unavailable');
          addTestResult('Health Check', false, null, 'Service returned unhealthy status');
        }
      } catch (error) {
        updateService('API Gateway Health', 'error', 'Connection failed');
        addTestResult('Health Check', false, null, error);
      }

      // Test 2: Authentication Verification
      const authStart = Date.now();
      try {
        const authResult = await DashDiceAPI.verifyAuth();
        const authTime = Date.now() - authStart;
        
        updateService('Authentication', 'healthy', `Token verified (${authTime}ms)`, authTime);
        addTestResult('Authentication', true, authResult, null);
      } catch (error) {
        updateService('Authentication', 'error', 'Token verification failed');
        addTestResult('Authentication', false, null, error);
      }

      // Test 3: User Profile
      const userStart = Date.now();
      try {
        const userData = await DashDiceAPI.getCurrentUser();
        const userTime = Date.now() - userStart;
        
        updateService('User Profile', 'healthy', `User data fetched (${userTime}ms)`, userTime);
        addTestResult('User Profile', true, userData, null);
      } catch (error) {
        updateService('User Profile', 'error', 'Failed to fetch user data');
        addTestResult('User Profile', false, null, error);
      }

      // Test 4: Queue Service
      const queueStart = Date.now();
      try {
        const queueStatus = await DashDiceAPI.getQueueStatus();
        const queueTime = Date.now() - queueStart;
        
        updateService('Queue Service', 'healthy', `Queue accessible (${queueTime}ms)`, queueTime);
        addTestResult('Queue Service', true, queueStatus, null);
      } catch (error) {
        updateService('Queue Service', 'error', 'Queue service unavailable');
        addTestResult('Queue Service', false, null, error);
      }

      // Test 5: WebSocket Connection
      try {
        const ws = await DashDiceAPI.createWebSocketConnection();
        if (ws) {
          setWsConnection(ws);
          
          ws.onopen = () => {
            updateService('WebSocket Connection', 'healthy', 'Connected and authenticated');
            addTestResult('WebSocket Connection', true, { status: 'connected' }, null);
          };
          
          ws.onerror = (error) => {
            updateService('WebSocket Connection', 'error', 'Connection error');
            addTestResult('WebSocket Connection', false, null, error);
          };
          
          // Close connection after test
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          }, 5000);
        } else {
          updateService('WebSocket Connection', 'error', 'Failed to create WebSocket');
          addTestResult('WebSocket Connection', false, null, 'WebSocket creation failed');
        }
      } catch (error) {
        updateService('WebSocket Connection', 'error', 'WebSocket failed');
        addTestResult('WebSocket Connection', false, null, error);
      }

    } catch (error) {
      console.error('Integration test error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (user) {
      runIntegrationTests();
    }

    // Cleanup WebSocket on unmount
    return () => {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.close();
      }
    };
  }, [user]);

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'checking': return '⏳';
      case 'healthy': return '✅';
      case 'error': return '❌';
    }
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'checking': return 'text-yellow-600';
      case 'healthy': return 'text-green-600';
      case 'error': return 'text-red-600';
    }
  };

  if (!user) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Go Services Integration Test</h3>
        <p className="text-yellow-700">Please log in to test the integration with Go microservices.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800">🔗 Go Services Integration Test</h3>
        <button
          onClick={runIntegrationTests}
          disabled={isRunning}
          className={`px-4 py-2 rounded-md font-medium ${
            isRunning
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isRunning ? 'Running Tests...' : 'Run Tests'}
        </button>
      </div>

      {/* Service Status */}
      <div className="mb-8">
        <h4 className="text-lg font-medium text-gray-700 mb-4">Service Status</h4>
        <div className="grid gap-3">
          {services.map((service) => (
            <div key={service.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center gap-3">
                <span className="text-xl">{getStatusIcon(service.status)}</span>
                <div>
                  <span className="font-medium text-gray-800">{service.name}</span>
                  <p className={`text-sm ${getStatusColor(service.status)}`}>{service.message}</p>
                </div>
              </div>
              {service.responseTime && (
                <span className="text-sm text-gray-500">{service.responseTime}ms</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div>
          <h4 className="text-lg font-medium text-gray-700 mb-4">Detailed Test Results</h4>
          <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="mb-2">
                <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                  [{new Date(result.timestamp).toLocaleTimeString()}]
                </span>{' '}
                <span className="text-blue-400">{result.test}:</span>{' '}
                {result.success ? (
                  <span className="text-green-400">PASS</span>
                ) : (
                  <span className="text-red-400">FAIL</span>
                )}
                {result.error && (
                  <div className="text-red-300 ml-4 text-xs">
                    Error: {JSON.stringify(result.error)}
                  </div>
                )}
                {result.data && result.success && (
                  <div className="text-gray-400 ml-4 text-xs">
                    Data: {JSON.stringify(result.data, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configuration Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h5 className="font-medium text-blue-800 mb-2">Integration Configuration</h5>
        <div className="text-sm text-blue-700">
          <p><strong>API Gateway:</strong> {process.env.NEXT_PUBLIC_API_GATEWAY_URL}</p>
          <p><strong>WebSocket:</strong> {process.env.NEXT_PUBLIC_WEBSOCKET_URL}</p>
          <p><strong>User:</strong> {user.email} ({user.uid})</p>
        </div>
      </div>
    </div>
  );
};
