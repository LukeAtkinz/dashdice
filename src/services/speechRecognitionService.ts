/**
 * Speech Recognition Service for Voice-to-Text Chat
 * Handles Web Speech API integration with real-time transcription
 */

export interface SpeechRecognitionConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechRecognitionCallbacks {
  onResult: (result: SpeechRecognitionResult) => void;
  onError: (error: string) => void;
  onStart: () => void;
  onEnd: () => void;
  onSoundStart: () => void;
  onSoundEnd: () => void;
}

class SpeechRecognitionService {
  private recognition: any = null;
  private isSupported: boolean = false;
  private isListening: boolean = false;
  private callbacks: Partial<SpeechRecognitionCallbacks> = {};
  private voiceActivityDetection: boolean = false;
  private silenceTimer: NodeJS.Timeout | null = null;
  private silenceThreshold: number = 2000; // 2 seconds of silence
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;

  constructor() {
    this.initializeRecognition();
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      // Initialize AudioContext for voice activity detection
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        this.audioContext = new AudioContext();
        console.log('🎤 AudioContext initialized for voice activity detection');
      } else {
        console.warn('🎤 AudioContext not supported - voice activity detection disabled');
      }
    } catch (error) {
      console.warn('🎤 Failed to initialize AudioContext:', error);
    }
  }

  private initializeRecognition() {
    // Check for Web Speech API support
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      this.isSupported = false;
      return;
    }

    this.isSupported = true;
    this.recognition = new SpeechRecognition();
    this.setupRecognitionEvents();
  }

  private setupRecognitionEvents() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks.onStart?.();
      console.log('🎤 Voice recognition started');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.callbacks.onEnd?.();
      console.log('🎤 Voice recognition ended');
    };

    this.recognition.onsoundstart = () => {
      this.callbacks.onSoundStart?.();
      console.log('🔊 Sound detected');
    };

    this.recognition.onsoundend = () => {
      this.callbacks.onSoundEnd?.();
      console.log('🔇 Sound ended');
    };

    this.recognition.onresult = (event: any) => {
      const results = event.results;
      const lastResult = results[results.length - 1];
      
      if (lastResult) {
        const transcript = lastResult[0].transcript;
        const confidence = lastResult[0].confidence;
        const isFinal = lastResult.isFinal;

        const result: SpeechRecognitionResult = {
          transcript: transcript.trim(),
          confidence,
          isFinal
        };

        this.callbacks.onResult?.(result);
        
        console.log(`🗣️ Transcript: "${transcript}" (${isFinal ? 'final' : 'interim'}, confidence: ${confidence?.toFixed(2) || 'N/A'})`);
      }
    };

    this.recognition.onerror = (event: any) => {
      let errorMessage = 'Speech recognition error';
      
      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please enable microphone permissions.';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your audio devices.';
          break;
        case 'network':
          errorMessage = 'Network error occurred during speech recognition.';
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not allowed.';
          break;
        case 'bad-grammar':
          errorMessage = 'Speech recognition grammar error.';
          break;
        case 'language-not-supported':
          errorMessage = 'Language not supported for speech recognition.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }

      this.callbacks.onError?.(errorMessage);
      console.error('🚫 Speech recognition error:', event.error, errorMessage);
    };
  }

  public configure(config: SpeechRecognitionConfig) {
    if (!this.recognition) return;

    // Set language (default to English US)
    this.recognition.lang = config.language || 'en-US';
    
    // Enable continuous recognition for real-time chat
    this.recognition.continuous = config.continuous ?? true;
    
    // Enable interim results for real-time feedback
    this.recognition.interimResults = config.interimResults ?? true;
    
    // Set maximum alternatives
    this.recognition.maxAlternatives = config.maxAlternatives || 1;

    console.log('🔧 Speech recognition configured:', {
      language: this.recognition.lang,
      continuous: this.recognition.continuous,
      interimResults: this.recognition.interimResults,
      maxAlternatives: this.recognition.maxAlternatives
    });
  }

  public setCallbacks(callbacks: Partial<SpeechRecognitionCallbacks>) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public async requestMicrophonePermission(): Promise<boolean> {
    try {
      console.log('🎤 Requesting microphone permission...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          // Enhanced audio constraints for better mobile support
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      });
      
      console.log('✅ Microphone permission granted, stream obtained');
      
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Audio track stopped after permission check');
      });
      
      console.log('✅ Microphone permission granted');
      
      // Additional mobile-specific setup
      if (this.isMobile()) {
        this.setupMobileOptimizations();
      }
      
      return true;
    } catch (error: any) {
      console.error('❌ Microphone permission error:', error);
      
      let errorMessage = 'Microphone permission denied.';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone access denied. Please click "Allow" when prompted, or enable microphone permissions in your browser settings.';
        
        // Mobile-specific instructions
        if (this.isMobile()) {
          if (this.isIOS()) {
            errorMessage += '\n\nOn iOS: Settings > Safari > Microphone > Allow';
          } else if (this.isAndroid()) {
            errorMessage += '\n\nOn Android: Site Settings > Microphone > Allow';
          }
        }
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Microphone not supported on this device or browser.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Microphone access blocked by security policy. Make sure you are using HTTPS.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Microphone request was cancelled. Please try again.';
      } else {
        errorMessage = `Microphone error: ${error.message || error.name || 'Unknown error'}`;
      }
      
      this.callbacks.onError?.(errorMessage);
      return false;
    }
  }

  public async startListening(): Promise<boolean> {
    console.log('🎤 SpeechRecognitionService.startListening called');
    
    if (!this.isSupported) {
      const errorMsg = 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.';
      console.error('🎤', errorMsg);
      this.callbacks.onError?.(errorMsg);
      return false;
    }

    if (this.isListening) {
      console.warn('🎤 Already listening, aborting previous session');
      try {
        this.recognition.abort();
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.log('🎤 Error aborting previous session:', e);
      }
    }

    console.log('🎤 Requesting microphone permission...');
    // Request microphone permission first
    const hasPermission = await this.requestMicrophonePermission();
    if (!hasPermission) {
      console.error('🎤 Microphone permission denied');
      return false;
    }

    try {
      console.log('🎤 Starting speech recognition...');
      
      // Clear any previous state
      this.isListening = false;
      
      // Start recognition
      this.recognition.start();
      
      // Mark as listening immediately (will be confirmed by onstart event)
      this.isListening = true;
      
      console.log('🎤 Speech recognition start() called successfully');
      return true;
    } catch (error: any) {
      console.error('🎤 Failed to start speech recognition:', error);
      
      let errorMessage = 'Failed to start voice recognition.';
      
      if (error.name === 'InvalidStateError') {
        console.log('🎤 InvalidStateError - recognition already started, aborting and retrying...');
        try {
          this.recognition.abort();
          await new Promise(resolve => setTimeout(resolve, 200));
          this.recognition.start();
          this.isListening = true;
          console.log('🎤 Successfully restarted after InvalidStateError');
          return true;
        } catch (retryError) {
          errorMessage = 'Voice recognition is busy. Please wait a moment and try again.';
        }
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access when prompted.';
      } else if (error.name === 'ServiceNotAllowedError') {
        errorMessage = 'Speech recognition service not allowed. Please check your browser settings.';
      } else {
        errorMessage = `Voice recognition error: ${error.message || error.name}`;
      }
      
      this.callbacks.onError?.(errorMessage);
      this.isListening = false;
      return false;
    }
  }

  public stopListening() {
    if (!this.recognition || !this.isListening) {
      return;
    }

    try {
      this.recognition.stop();
      
      // Stop voice activity detection
      if (this.voiceActivityDetection) {
        this.stopVoiceActivityDetection();
      }
    } catch (error) {
      console.error('❌ Failed to stop speech recognition:', error);
    }
  }

  public abort() {
    if (!this.recognition) return;

    try {
      this.recognition.abort();
      this.isListening = false;
      
      // Stop voice activity detection
      if (this.voiceActivityDetection) {
        this.stopVoiceActivityDetection();
      }
    } catch (error) {
      console.error('❌ Failed to abort speech recognition:', error);
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public getSupportedLanguages(): string[] {
    // Common languages supported by most browsers
    return [
      'en-US', // English (US)
      'en-GB', // English (UK)
      'es-ES', // Spanish (Spain)
      'es-MX', // Spanish (Mexico)
      'fr-FR', // French
      'de-DE', // German
      'it-IT', // Italian
      'pt-BR', // Portuguese (Brazil)
      'ja-JP', // Japanese
      'ko-KR', // Korean
      'zh-CN', // Chinese (Simplified)
      'zh-TW', // Chinese (Traditional)
      'ru-RU', // Russian
      'ar-SA', // Arabic
      'hi-IN', // Hindi
      'th-TH', // Thai
      'vi-VN', // Vietnamese
      'nl-NL', // Dutch
      'sv-SE', // Swedish
      'da-DK', // Danish
      'no-NO', // Norwegian
      'fi-FI', // Finnish
      'pl-PL', // Polish
      'cs-CZ', // Czech
      'hu-HU', // Hungarian
      'ro-RO', // Romanian
      'bg-BG', // Bulgarian
      'hr-HR', // Croatian
      'sk-SK', // Slovak
      'sl-SI', // Slovenian
      'et-EE', // Estonian
      'lv-LV', // Latvian
      'lt-LT', // Lithuanian
      'mt-MT', // Maltese
      'tr-TR', // Turkish
      'uk-UA', // Ukrainian
    ];
  }

  // Mobile and platform detection methods
  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  private isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }

  private setupMobileOptimizations(): void {
    if (!this.recognition) return;

    console.log('📱 Setting up mobile optimizations for speech recognition');

    // iOS-specific optimizations
    if (this.isIOS()) {
      // iOS Safari has specific requirements
      this.recognition.continuous = false; // iOS works better with non-continuous mode
      this.recognition.interimResults = false; // Reduce interim results for better performance
      console.log('🍎 Applied iOS optimizations');
    }

    // Android-specific optimizations
    if (this.isAndroid()) {
      // Android Chrome usually handles continuous mode well
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      console.log('🤖 Applied Android optimizations');
    }

    // General mobile optimizations
    this.recognition.maxAlternatives = 1; // Reduce processing overhead
  }

  // Voice Activity Detection methods
  public async enableVoiceActivityDetection(enabled: boolean = true, silenceThreshold: number = 2000): Promise<boolean> {
    this.voiceActivityDetection = enabled;
    this.silenceThreshold = silenceThreshold;

    if (enabled) {
      try {
        // Set up audio context for voice activity detection
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🎵 Audio context created for voice activity detection');
        return true;
      } catch (error) {
        console.error('❌ Failed to set up voice activity detection:', error);
        this.voiceActivityDetection = false;
        return false;
      }
    } else {
      // Clean up audio context
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }
      this.stopVoiceActivityDetection();
      console.log('🔇 Voice activity detection disabled');
      return true;
    }
  }

  private async startVoiceActivityDetection(): Promise<void> {
    console.log('🎤 Starting voice activity detection...');
    
    if (!this.voiceActivityDetection) {
      console.log('🎤 Voice activity detection disabled');
      return;
    }
    
    if (!this.audioContext) {
      console.warn('🎤 AudioContext not available for voice activity detection');
      return;
    }

    try {
      // Get microphone stream
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // We want to detect all audio
          autoGainControl: true
        } 
      });

      // Create analyser node
      const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      source.connect(this.analyser);
      
      console.log('🎤 Voice activity detection started successfully');
    } catch (error) {
      console.error('🎤 Failed to start voice activity detection:', error);
    }
  }

  private stopVoiceActivityDetection(): void {
    console.log('🎤 Stopping voice activity detection...');
    
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => {
        track.stop();
        console.log('🎤 Audio track stopped');
      });
      this.microphoneStream = null;
    }
    
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    
    this.analyser = null;
    console.log('🎤 Voice activity detection stopped');
  }

  private monitorVoiceActivity(): void {
    if (!this.analyser || !this.voiceActivityDetection) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkAudioLevel = () => {
      if (!this.analyser || !this.voiceActivityDetection) return;

      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;

      // Voice activity threshold (adjust as needed)
      const voiceThreshold = 25;
      const hasVoiceActivity = average > voiceThreshold;

      if (hasVoiceActivity) {
        // Voice detected - clear silence timer
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
      } else {
        // No voice - start or continue silence timer
        if (this.isListening && !this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            console.log('🔇 Silence detected, stopping recognition');
            this.stopListening();
          }, this.silenceThreshold);
        }
      }

      // Continue monitoring
      if (this.voiceActivityDetection) {
        requestAnimationFrame(checkAudioLevel);
      }
    };

    checkAudioLevel();
  }

  public static getInstance(): SpeechRecognitionService {
    if (!(window as any).__speechRecognitionService) {
      (window as any).__speechRecognitionService = new SpeechRecognitionService();
    }
    return (window as any).__speechRecognitionService;
  }
}

export default SpeechRecognitionService;