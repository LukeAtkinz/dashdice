# Voice Chat Quick Reference

## 🎤 Quick Start

### For Users
1. Click microphone button (🎤) or press **Space bar**
2. Speak your message
3. Release to send
4. That's it!

### For Developers
```tsx
import VoiceChat from '@/components/chat/VoiceChat';

<VoiceChat onMessage={(text) => sendMessage(text)} />
```

---

## 📋 Component Quick Reference

### VoiceChat
```tsx
<VoiceChat
  onMessage={(text) => sendMessage(text)}
  language="en-US"
  autoSend={true}
  showTranscript={true}
  minWordCount={2}
/>
```

### ChatInput (Text + Voice)
```tsx
<ChatInput
  onSendMessage={sendMessage}
  showVoiceChat={true}
  voiceLanguage="en-US"
/>
```

### VoiceChatSettings
```tsx
<VoiceChatSettingsComponent
  settings={settings}
  onSettingsChange={setSettings}
/>
```

### VoicePermissionsDialog
```tsx
<VoicePermissionsDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  onGranted={() => enableVoice()}
  onDenied={() => disableVoice()}
/>
```

---

## 🔧 Service Quick Reference

```typescript
// Get service instance
const service = SpeechRecognitionService.getInstance();

// Configure
service.configure({
  language: 'en-US',
  continuous: true,
  interimResults: true
});

// Set callbacks
service.setCallbacks({
  onResult: (result) => console.log(result.transcript),
  onError: (error) => console.error(error)
});

// Start/Stop
await service.startListening();
service.stopListening();

// Check support
if (service.getIsSupported()) {
  // Supported
}
```

---

## 🎣 Hook Quick Reference

```typescript
const {
  isListening,
  transcript,
  error,
  startListening,
  stopListening,
  clearTranscript
} = useSpeechRecognition({
  config: { language: 'en-US' },
  onTranscript: (text, isFinal) => {
    if (isFinal) handleMessage(text);
  }
});
```

---

## ⚙️ Settings Reference

```typescript
interface VoiceChatSettings {
  enabled: boolean;              // Enable/disable voice chat
  language: string;              // e.g., 'en-US', 'es-ES'
  autoSend: boolean;             // Auto-send on completion
  voiceActivityDetection: boolean; // Auto-stop on silence
  silenceThreshold: number;      // Milliseconds (1000-5000)
  minConfidence: number;         // 0.0 - 1.0
  minWordCount: number;          // Minimum words (1-10)
  showTranscript: boolean;       // Show live transcript
}
```

---

## 🌍 Supported Languages

**Most Common:**
- `en-US` - English (US)
- `en-GB` - English (UK)
- `es-ES` - Spanish
- `fr-FR` - French
- `de-DE` - German
- `ja-JP` - Japanese
- `zh-CN` - Chinese

**All 30+ Languages:**
```typescript
service.getSupportedLanguages()
```

---

## 🖥️ Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Best |
| Edge | ✅ Best |
| Safari | ✅ Good |
| iOS Safari | ✅ Good |
| Android Chrome | ✅ Good |
| Firefox | ❌ No |

---

## ⌨️ Keyboard Shortcuts

- **Space Bar** - Push to talk (hold/release)
- **Enter** - Send message (text mode)
- **Escape** - Cancel/Close
- **Tab** - Navigate controls

---

## 🐛 Common Issues

### "Not Supported"
→ Use Chrome, Edge, or Safari

### "Permission Denied"
→ Click lock icon → Microphone → Allow

### "No Speech Detected"
→ Check microphone volume/connection

### "Low Confidence"
→ Speak clearly, reduce background noise

---

## 📱 Mobile Tips

### iOS
- Use Safari (not Chrome on iOS)
- Grant permissions in Settings → Safari → Microphone
- Tap and hold button to speak

### Android
- Use Chrome browser
- Grant permissions when prompted
- Works best with headset mic

---

## 🔒 Privacy Notes

✅ All processing happens in your browser
✅ No audio sent to servers
✅ No audio recordings stored
✅ Only text transcripts generated
✅ You control permissions

---

## 🧪 Testing

### Quick Test
1. Go to `/voice-chat-demo`
2. Click microphone
3. Say "Hello world"
4. Verify message appears

### Full Tests
See `VOICE_CHAT_TESTING_GUIDE.md`

---

## 📚 Full Documentation

- **Complete Docs**: `VOICE_CHAT_DOCUMENTATION.md`
- **Testing Guide**: `VOICE_CHAT_TESTING_GUIDE.md`
- **Demo Page**: `/voice-chat-demo`

---

## 💡 Pro Tips

1. **Speak naturally** - No need to shout or speak slowly
2. **Use quiet environment** - Reduces transcription errors
3. **Test your settings** - Use demo page first
4. **Configure language** - Match your speaking language
5. **Headset recommended** - Better audio quality on mobile

---

## 🆘 Need Help?

1. Check `VOICE_CHAT_DOCUMENTATION.md` (comprehensive guide)
2. Test on `/voice-chat-demo` (demo page)
3. Review browser console for errors
4. Verify browser compatibility
5. Check microphone permissions

---

**Version**: 1.0.0  
**Last Updated**: November 5, 2025
