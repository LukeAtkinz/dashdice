# Voice Chat Feature Documentation

## Overview

DashDice includes a comprehensive voice-to-text chat system that allows players to communicate using their voice instead of typing. The system uses the Web Speech API to provide real-time transcription with support for multiple languages and platforms.

## Features

### 🎤 Voice Input
- **Push-to-Talk**: Hold button or Space key to speak
- **Real-time Transcription**: See your words appear as you speak
- **Auto-send**: Automatically send messages when you finish speaking
- **Multiple Languages**: Support for 30+ languages
- **High Accuracy**: Confidence filtering ensures quality transcriptions

### 📱 Device Support
- **Desktop Browsers**: Chrome, Edge, Safari
- **iOS**: Safari 14.5+
- **Android**: Chrome 89+
- **Automatic Optimizations**: Platform-specific settings for best performance

### ⚙️ Smart Features
- **Voice Activity Detection**: Automatically stop recording after silence
- **Confidence Filtering**: Only send high-quality transcriptions
- **Minimum Word Count**: Prevent accidental single-word sends
- **Live Transcript Display**: See what you're saying in real-time
- **Keyboard Shortcuts**: Space bar for quick push-to-talk

### 🔧 Customization
- Language selection (30+ languages)
- Sensitivity controls
- Auto-send settings
- Transcript visibility
- Persistent user preferences

## Components

### 1. VoiceChat Component
**Location**: `src/components/chat/VoiceChat.tsx`

The main voice input component with push-to-talk functionality.

**Props**:
```typescript
interface VoiceChatProps {
  onMessage: (message: string) => void;  // Callback when message is ready
  disabled?: boolean;                     // Disable voice input
  placeholder?: string;                   // Placeholder text
  language?: string;                      // Speech recognition language
  className?: string;                     // Additional CSS classes
  showTranscript?: boolean;               // Show live transcript
  autoSend?: boolean;                     // Auto-send on completion
  minWordCount?: number;                  // Min words before sending
}
```

**Usage**:
```tsx
import VoiceChat from '@/components/chat/VoiceChat';

<VoiceChat
  onMessage={(text) => handleSendMessage(text)}
  language="en-US"
  showTranscript={true}
  autoSend={true}
  minWordCount={2}
/>
```

**Features**:
- Visual feedback (pulsing animation when recording)
- Confidence indicator
- Error handling with user-friendly messages
- Keyboard support (Space bar)
- Mobile-optimized touch targets

### 2. ChatInput Component
**Location**: `src/components/chat/ChatInput.tsx`

Combined text and voice input with mode toggle.

**Props**:
```typescript
interface ChatInputProps {
  onSendMessage: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  showVoiceChat?: boolean;  // Enable/disable voice mode
  voiceLanguage?: string;
  className?: string;
  autoFocus?: boolean;
}
```

**Usage**:
```tsx
import ChatInput from '@/components/chat/ChatInput';

<ChatInput
  onSendMessage={handleMessage}
  placeholder="Type or speak..."
  showVoiceChat={true}
  voiceLanguage="en-US"
  maxLength={500}
/>
```

**Features**:
- Toggle between text and voice mode
- Character counter for text input
- Integrated voice chat
- Enter to send (text mode)
- Space to speak (voice mode)

### 3. VoiceChatSettings Component
**Location**: `src/components/chat/VoiceChatSettings.tsx`

Settings panel for configuring voice chat preferences.

**Props**:
```typescript
interface VoiceChatSettingsProps {
  settings: VoiceChatSettings;
  onSettingsChange: (settings: VoiceChatSettings) => void;
  onClose?: () => void;
  className?: string;
}

interface VoiceChatSettings {
  enabled: boolean;
  language: string;
  autoSend: boolean;
  voiceActivityDetection: boolean;
  silenceThreshold: number;  // milliseconds
  minConfidence: number;     // 0-1
  minWordCount: number;
  showTranscript: boolean;
}
```

**Usage**:
```tsx
import VoiceChatSettingsComponent, {
  loadVoiceChatSettings,
  saveVoiceChatSettings
} from '@/components/chat/VoiceChatSettings';

const [settings, setSettings] = useState(loadVoiceChatSettings());

const handleSettingsChange = (newSettings) => {
  setSettings(newSettings);
  saveVoiceChatSettings(newSettings);
};

<VoiceChatSettingsComponent
  settings={settings}
  onSettingsChange={handleSettingsChange}
  onClose={() => setShowSettings(false)}
/>
```

### 4. VoicePermissionsDialog Component
**Location**: `src/components/chat/VoicePermissionsDialog.tsx`

Modal dialog for requesting microphone permissions with platform-specific instructions.

**Props**:
```typescript
interface VoicePermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGranted: () => void;
  onDenied: () => void;
}
```

**Usage**:
```tsx
import VoicePermissionsDialog from '@/components/chat/VoicePermissionsDialog';

<VoicePermissionsDialog
  isOpen={showPermissionDialog}
  onClose={() => setShowPermissionDialog(false)}
  onGranted={() => {
    console.log('Microphone access granted');
    setVoiceEnabled(true);
  }}
  onDenied={() => {
    console.log('Microphone access denied');
    setVoiceEnabled(false);
  }}
/>
```

**Features**:
- Platform detection (iOS, Android, Desktop)
- Platform-specific instructions
- Privacy-focused messaging
- Error handling with retry option
- Beautiful, accessible UI

## Services

### SpeechRecognitionService
**Location**: `src/services/speechRecognitionService.ts`

Singleton service managing the Web Speech API.

**Key Methods**:
```typescript
class SpeechRecognitionService {
  // Get singleton instance
  static getInstance(): SpeechRecognitionService;
  
  // Configure recognition
  configure(config: SpeechRecognitionConfig): void;
  
  // Set callbacks
  setCallbacks(callbacks: Partial<SpeechRecognitionCallbacks>): void;
  
  // Request microphone permission
  async requestMicrophonePermission(): Promise<boolean>;
  
  // Start/stop listening
  async startListening(): Promise<boolean>;
  stopListening(): void;
  abort(): void;
  
  // Get state
  getIsListening(): boolean;
  getIsSupported(): boolean;
  getSupportedLanguages(): string[];
  
  // Voice activity detection
  async enableVoiceActivityDetection(
    enabled: boolean, 
    silenceThreshold: number
  ): Promise<boolean>;
}
```

**Configuration**:
```typescript
const service = SpeechRecognitionService.getInstance();

service.configure({
  language: 'en-US',
  continuous: true,
  interimResults: true,
  maxAlternatives: 1
});

service.setCallbacks({
  onResult: (result) => console.log(result),
  onError: (error) => console.error(error),
  onStart: () => console.log('Started'),
  onEnd: () => console.log('Ended')
});
```

## Hooks

### useSpeechRecognition Hook
**Location**: `src/hooks/useSpeechRecognition.ts`

React hook for easy integration of speech recognition.

**Usage**:
```typescript
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

const {
  isListening,
  isSupported,
  transcript,
  interimTranscript,
  error,
  confidence,
  startListening,
  stopListening,
  clearTranscript,
  setLanguage,
  getSupportedLanguages
} = useSpeechRecognition({
  config: {
    language: 'en-US',
    continuous: true,
    interimResults: true
  },
  onTranscript: (text, isFinal) => {
    if (isFinal) {
      handleMessage(text);
    }
  },
  minConfidence: 0.7
});
```

## Supported Languages

The voice chat system supports 30+ languages:

- **English**: en-US, en-GB
- **Spanish**: es-ES, es-MX
- **French**: fr-FR
- **German**: de-DE
- **Italian**: it-IT
- **Portuguese**: pt-BR
- **Chinese**: zh-CN, zh-TW
- **Japanese**: ja-JP
- **Korean**: ko-KR
- **Russian**: ru-RU
- **Arabic**: ar-SA
- **Hindi**: hi-IN
- And many more...

See `SpeechRecognitionService.getSupportedLanguages()` for the complete list.

## Browser Support

### Desktop
- ✅ Chrome 33+ (Best support)
- ✅ Edge 79+
- ✅ Safari 14.1+
- ❌ Firefox (Not supported)

### Mobile
- ✅ iOS Safari 14.5+
- ✅ Android Chrome 89+
- ⚠️ Mobile Firefox (Not supported)

### Feature Detection
```typescript
const service = SpeechRecognitionService.getInstance();
if (service.getIsSupported()) {
  // Voice chat is supported
} else {
  // Show fallback to text input
}
```

## Platform-Specific Optimizations

### iOS
- Non-continuous mode for better stability
- Reduced interim results for performance
- Touch-optimized UI elements

### Android
- Continuous mode enabled
- Full interim results support
- Enhanced audio constraints

### Desktop
- Keyboard shortcuts (Space bar)
- Full feature support
- Mouse and keyboard controls

## Privacy & Security

### Privacy Features
1. **Local Processing**: All speech recognition is done by the browser
2. **No Audio Storage**: Audio is never sent to servers
3. **No Audio Recording**: Only text transcripts are generated
4. **User Control**: Easy enable/disable in settings
5. **Transparent Permissions**: Clear permission dialogs

### Security Considerations
- HTTPS required for microphone access
- Same-origin policy applies
- User can revoke permissions anytime
- No sensitive data stored

## Accessibility

### Keyboard Navigation
- Tab navigation through all controls
- Space bar for push-to-talk
- Enter to send (text mode)
- Escape to cancel

### Screen Reader Support
- ARIA labels on all interactive elements
- Status announcements
- Error messages read aloud

### Visual Indicators
- Color-blind friendly status colors
- Clear visual feedback
- High contrast mode support

## Troubleshooting

### Common Issues

#### 1. "Microphone not supported"
**Cause**: Browser doesn't support Web Speech API
**Solution**: Use Chrome, Edge, or Safari

#### 2. "Permission denied"
**Cause**: User blocked microphone access
**Solution**: 
- Desktop: Click lock icon in address bar → Microphone → Allow
- iOS: Settings → Safari → Microphone → Allow
- Android: Site Settings → Microphone → Allow

#### 3. "No speech detected"
**Cause**: Microphone not working or too quiet
**Solution**:
- Check microphone is plugged in
- Test microphone in system settings
- Increase microphone volume
- Speak closer to microphone

#### 4. "Low confidence transcriptions"
**Cause**: Background noise or unclear speech
**Solution**:
- Speak clearly and at normal pace
- Reduce background noise
- Lower minimum confidence in settings

#### 5. "Voice stops recording too early"
**Cause**: Voice activity detection sensitivity
**Solution**:
- Disable voice activity detection in settings
- Increase silence threshold
- Use manual push-to-talk

## Best Practices

### For Users
1. **Speak Clearly**: Articulate words at normal pace
2. **Reduce Noise**: Use in quiet environments
3. **Check Settings**: Configure language and sensitivity
4. **Test First**: Use demo page to test before games
5. **Keep Updated**: Update browser for best support

### For Developers
1. **Feature Detection**: Always check if supported
2. **Graceful Fallback**: Provide text input option
3. **Error Handling**: Show user-friendly error messages
4. **Privacy First**: Explain microphone usage clearly
5. **Test Across Platforms**: iOS, Android, Desktop

## Demo & Testing

### Voice Chat Demo Page
**URL**: `/voice-chat-demo`

The demo page provides:
- Live testing of voice functionality
- Settings configuration
- Message history
- Multiple input modes
- Browser compatibility check

### Testing Checklist
- [ ] Microphone permission request works
- [ ] Voice recognition starts/stops correctly
- [ ] Transcript appears in real-time
- [ ] Messages send automatically (if enabled)
- [ ] Settings persist across sessions
- [ ] Error messages display correctly
- [ ] Mobile optimizations work
- [ ] Keyboard shortcuts function
- [ ] Multiple languages work
- [ ] Permission dialog appears on mobile

## Integration Examples

### Simple Voice Chat
```tsx
import VoiceChat from '@/components/chat/VoiceChat';

function SimpleChat() {
  const handleMessage = (text: string) => {
    console.log('Voice message:', text);
    // Send to chat service
  };

  return (
    <VoiceChat
      onMessage={handleMessage}
      language="en-US"
      autoSend={true}
    />
  );
}
```

### Combined Text/Voice Input
```tsx
import ChatInput from '@/components/chat/ChatInput';

function CombinedChat() {
  return (
    <ChatInput
      onSendMessage={(text) => sendMessage(text)}
      showVoiceChat={true}
      maxLength={500}
    />
  );
}
```

### With Settings
```tsx
import { useState } from 'react';
import VoiceChat from '@/components/chat/VoiceChat';
import VoiceChatSettingsComponent, {
  loadVoiceChatSettings,
  saveVoiceChatSettings
} from '@/components/chat/VoiceChatSettings';

function ChatWithSettings() {
  const [settings, setSettings] = useState(loadVoiceChatSettings());
  const [showSettings, setShowSettings] = useState(false);

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    saveVoiceChatSettings(newSettings);
  };

  return (
    <div>
      <button onClick={() => setShowSettings(!showSettings)}>
        Settings
      </button>
      
      {showSettings && (
        <VoiceChatSettingsComponent
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}
      
      <VoiceChat
        onMessage={(text) => sendMessage(text)}
        language={settings.language}
        autoSend={settings.autoSend}
        minWordCount={settings.minWordCount}
        showTranscript={settings.showTranscript}
      />
    </div>
  );
}
```

## Performance Considerations

### Optimization Tips
1. **Lazy Loading**: Load speech recognition components on demand
2. **Singleton Pattern**: Reuse SpeechRecognitionService instance
3. **Cleanup**: Stop recognition when component unmounts
4. **Debouncing**: Use minimum word count to reduce processing
5. **Mobile**: Apply platform-specific optimizations

### Resource Usage
- **CPU**: Low (browser handles processing)
- **Memory**: ~10-20MB
- **Network**: None (local processing)
- **Battery**: Moderate (microphone usage)

## Future Enhancements

### Planned Features
- [ ] Voice commands (e.g., "send", "cancel")
- [ ] Custom wake words
- [ ] Noise cancellation improvements
- [ ] Offline support (where possible)
- [ ] Voice activity visualization
- [ ] Multi-speaker detection
- [ ] Automatic language detection
- [ ] Dictation mode for longer messages

## Support & Resources

### Documentation
- [Web Speech API MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Browser Compatibility](https://caniuse.com/speech-recognition)

### Getting Help
1. Check troubleshooting section above
2. Test on demo page: `/voice-chat-demo`
3. Verify browser compatibility
4. Check browser console for errors

## Changelog

### Version 1.0.0 (Initial Release)
- ✅ Core voice-to-text functionality
- ✅ Push-to-talk with Space bar
- ✅ Real-time transcription
- ✅ Multi-language support
- ✅ Mobile optimizations
- ✅ Settings panel
- ✅ Permission dialog
- ✅ Demo page
- ✅ Comprehensive documentation

---

**Last Updated**: November 5, 2025
**Maintained By**: DashDice Development Team
