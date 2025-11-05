'use client';

import { useState, useEffect } from 'react';

/**
 * Microphone Test Page
 * 
 * Diagnostic tool to test if microphone is working properly
 */
export default function MicTestPage() {
  const [status, setStatus] = useState<string>('Click "Test Microphone" to begin');
  const [logs, setLogs] = useState<string[]>([]);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [isListening, setIsListening] = useState(false);
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
    console.log(message);
  };

  const testMicrophone = async () => {
    try {
      addLog('🎤 Requesting microphone access...');
      setStatus('Requesting microphone permission...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      addLog('✅ Microphone permission granted!');
      setStatus('Microphone active - speak now!');
      setIsListening(true);
      
      // Create audio context to measure microphone level
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      const checkLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setMicLevel(Math.round(average));
        
        if (average > 10) {
          addLog(`🔊 Sound detected! Level: ${Math.round(average)}`);
        }
        
        if (isListening) {
          requestAnimationFrame(checkLevel);
        }
      };
      
      checkLevel();
      
      addLog('📊 Microphone level monitoring started');
      addLog('💬 Speak into your microphone to see the levels');
      
      // Auto-stop after 30 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        setIsListening(false);
        setStatus('Test complete');
        addLog('⏹️ Test ended after 30 seconds');
      }, 30000);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog(`❌ Error: ${errorMsg}`);
      setStatus(`Error: ${errorMsg}`);
      setIsListening(false);
    }
  };

  const testSpeechRecognition = () => {
    addLog('🎤 Testing Web Speech API...');
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      addLog('❌ Speech Recognition not supported in this browser');
      setStatus('Speech Recognition not supported');
      return;
    }
    
    addLog('✅ Speech Recognition API available');
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      addLog('✅ Speech recognition started - SAY SOMETHING NOW!');
      setStatus('🎤 Listening... SPEAK NOW!');
      setIsListening(true);
    };
    
    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript;
      const isFinal = last.isFinal;
      
      addLog(`📝 ${isFinal ? 'FINAL' : 'interim'}: "${transcript}"`);
      setStatus(`Heard: "${transcript}"`);
    };
    
    recognition.onerror = (event: any) => {
      addLog(`❌ Speech recognition error: ${event.error}`);
      setStatus(`Error: ${event.error}`);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      addLog('⏹️ Speech recognition ended');
      setStatus('Speech recognition ended');
      setIsListening(false);
    };
    
    try {
      recognition.start();
      addLog('▶️ Starting speech recognition...');
      
      // Auto-stop after 15 seconds
      setTimeout(() => {
        try {
          recognition.stop();
          addLog('⏹️ Stopping speech recognition after 15 seconds');
        } catch (e) {
          // Already stopped
        }
      }, 15000);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog(`❌ Failed to start: ${errorMsg}`);
      setStatus(`Failed: ${errorMsg}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">🎤 Microphone Diagnostic Tool</h1>
        <p className="text-gray-400 mb-8">Test if your microphone and speech recognition are working</p>
        
        {/* Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="text-2xl font-bold mb-4">{status}</div>
          
          {/* Microphone Level Indicator */}
          {isListening && (
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">Microphone Level: {micLevel}</div>
              <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-100 ${
                    micLevel > 50 ? 'bg-green-500' :
                    micLevel > 20 ? 'bg-yellow-500' :
                    micLevel > 5 ? 'bg-blue-500' :
                    'bg-gray-600'
                  }`}
                  style={{ width: `${Math.min(micLevel * 2, 100)}%` }}
                />
              </div>
              {micLevel < 5 && (
                <div className="text-yellow-400 text-sm mt-2">
                  ⚠️ Low mic level - try speaking louder or check your microphone settings
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Test Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={testMicrophone}
            disabled={isListening}
            className="px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold text-lg transition-colors"
          >
            🎤 Test Microphone (Audio Level)
          </button>
          
          <button
            onClick={testSpeechRecognition}
            disabled={isListening}
            className="px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold text-lg transition-colors"
          >
            🗣️ Test Speech Recognition
          </button>
        </div>
        
        {/* Instructions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📋 Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Click "Test Microphone" to check if your mic is working (watch the level bar)</li>
            <li>Click "Test Speech Recognition" to test if speech-to-text works</li>
            <li>When testing speech recognition, <strong>SPEAK CLEARLY AND LOUDLY</strong></li>
            <li>Check the logs below to see what's happening</li>
          </ol>
          
          <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-600 rounded">
            <div className="font-semibold text-yellow-400 mb-2">⚠️ Troubleshooting Tips:</div>
            <ul className="text-sm space-y-1 text-gray-300">
              <li>• Make sure your browser has microphone permission (check browser address bar)</li>
              <li>• Check Windows sound settings - make sure correct mic is selected and not muted</li>
              <li>• Try speaking VERY LOUDLY and clearly</li>
              <li>• Chrome/Edge work best for speech recognition</li>
              <li>• Some mics need physical volume adjustment</li>
            </ul>
          </div>
        </div>
        
        {/* Logs */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">📝 Logs</h2>
          <div className="bg-black rounded p-4 max-h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet - click a test button above</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
