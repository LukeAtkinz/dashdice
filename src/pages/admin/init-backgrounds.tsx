import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

export default function InitBackgroundsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleInitialize = async () => {
    setStatus('running');
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/admin/initialize-backgrounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setStatus('complete');
        setResult(data);
      } else {
        setStatus('error');
        setError(data.message || 'Unknown error occurred');
      }
    } catch (err: any) {
      setStatus('error');
      setError(err.message);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Please sign in</h1>
          <p>You must be signed in to use this admin tool</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-2xl w-full bg-gray-800 rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Initialize User Backgrounds</h1>
        
        <p className="text-gray-300 mb-6 text-center">
          This will add default turn decider and victory backgrounds to all users who don't have them yet.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleInitialize}
            disabled={status === 'running'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            {status === 'running' ? 'Initializing...' : 'Initialize Backgrounds'}
          </button>

          {status === 'running' && (
            <div className="text-center text-gray-300">
              <div className="animate-spin inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
              <p>Processing all users...</p>
            </div>
          )}

          {status === 'complete' && result && (
            <div className="bg-green-900 border border-green-500 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-2 text-green-300">✅ Initialization Complete!</h2>
              <div className="space-y-1 text-sm">
                <p>Total users: {result.summary.totalUsers}</p>
                <p>Updated: {result.summary.updated}</p>
                <p>Skipped: {result.summary.skipped}</p>
                {result.summary.errors > 0 && (
                  <p className="text-red-300">Errors: {result.summary.errors}</p>
                )}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-900 border border-red-500 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-2 text-red-300">❌ Error</h2>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {result?.summary?.errorDetails && (
            <details className="bg-gray-700 rounded-lg p-4">
              <summary className="cursor-pointer font-bold">Error Details</summary>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(result.summary.errorDetails, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
