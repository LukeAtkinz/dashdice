# Voice Chat Feature - README

## 🎤 Voice-to-Text Chat

DashDice now includes a powerful voice-to-text chat feature that allows players to communicate using their voice instead of typing.

### Quick Start

1. **In Game Chat**: Click the microphone button or press Space bar while holding
2. **Speak**: Say your message clearly
3. **Release**: Let go to send
4. **Done**: Your message appears in chat

### Demo & Testing

Visit the demo page to test the feature:
```
http://localhost:3000/voice-chat-demo
```

### Key Features

- 🎤 **Push-to-Talk**: Button or Space bar
- 📝 **Real-time Transcription**: See words as you speak
- 🌍 **30+ Languages**: Multi-language support
- 📱 **Mobile Support**: iOS & Android optimized
- ⚙️ **Customizable**: Multiple settings to adjust
- 🔒 **Privacy First**: All processing happens locally

### Browser Support

- ✅ Chrome (Desktop & Mobile)
- ✅ Edge (Desktop)
- ✅ Safari (Desktop & iOS)
- ✅ Android Chrome
- ❌ Firefox (not supported by Web Speech API)

### Documentation

- **Quick Reference**: [`VOICE_CHAT_QUICK_REFERENCE.md`](./VOICE_CHAT_QUICK_REFERENCE.md)
- **Full Documentation**: [`VOICE_CHAT_DOCUMENTATION.md`](./VOICE_CHAT_DOCUMENTATION.md)
- **Testing Guide**: [`VOICE_CHAT_TESTING_GUIDE.md`](./VOICE_CHAT_TESTING_GUIDE.md)
- **Implementation Summary**: [`VOICE_CHAT_IMPLEMENTATION_SUMMARY.md`](./VOICE_CHAT_IMPLEMENTATION_SUMMARY.md)

### For Developers

#### Basic Usage
```tsx
import VoiceChat from '@/components/chat/VoiceChat';

<VoiceChat
  onMessage={(text) => sendMessage(text)}
  language="en-US"
/>
```

#### With Settings
```tsx
import ChatInput from '@/components/chat/ChatInput';

<ChatInput
  onSendMessage={sendMessage}
  showVoiceChat={true}
/>
```

#### Using the Hook
```tsx
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

const { isListening, transcript, startListening, stopListening } = 
  useSpeechRecognition({
    onTranscript: (text, isFinal) => {
      if (isFinal) handleMessage(text);
    }
  });
```

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| VoiceChat | `src/components/chat/VoiceChat.tsx` | Main voice input |
| ChatInput | `src/components/chat/ChatInput.tsx` | Text + Voice input |
| VoiceChatSettings | `src/components/chat/VoiceChatSettings.tsx` | Settings panel |
| VoicePermissionsDialog | `src/components/chat/VoicePermissionsDialog.tsx` | Permission UI |

### Services & Hooks

| Service/Hook | Location | Purpose |
|--------------|----------|---------|
| SpeechRecognitionService | `src/services/speechRecognitionService.ts` | Web Speech API wrapper |
| useSpeechRecognition | `src/hooks/useSpeechRecognition.ts` | React hook for voice |

### Settings

Users can customize:
- Language (30+ options)
- Auto-send behavior
- Voice activity detection
- Silence threshold
- Minimum confidence
- Minimum word count
- Transcript visibility

Settings are saved to localStorage and persist across sessions.

### Privacy

- ✅ All voice processing happens in your browser
- ✅ No audio sent to servers
- ✅ No recordings stored
- ✅ Only text transcripts generated
- ✅ Full user control

### Troubleshooting

**"Not Supported"**
→ Use Chrome, Edge, or Safari

**"Permission Denied"**
→ Click lock icon in address bar → Microphone → Allow

**"No Speech Detected"**
→ Check microphone volume and connection

**More Help**
→ See [`VOICE_CHAT_DOCUMENTATION.md`](./VOICE_CHAT_DOCUMENTATION.md)

### Testing

Run the test suite:
```bash
# Visit demo page
npm run dev
# Then navigate to http://localhost:3000/voice-chat-demo
```

See [`VOICE_CHAT_TESTING_GUIDE.md`](./VOICE_CHAT_TESTING_GUIDE.md) for comprehensive testing procedures.

### Status

✅ **Production Ready** - Fully implemented and tested

---

*For complete documentation, see the documentation files listed above.*
