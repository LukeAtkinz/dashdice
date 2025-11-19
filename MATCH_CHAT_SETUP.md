# Match Chat System - Setup Guide

## Overview
Real-time voice-to-text match chat system using OpenAI Whisper API for transcription. Players can communicate via push-to-talk voice or text messages during matches.

## Features
- ✅ Push-to-talk voice recording
- ✅ Real-time transcription via Whisper API
- ✅ Text chat fallback
- ✅ Auto-scrolling chat feed
- ✅ Expandable chat overlay
- ✅ Mute controls (chat & microphone)
- ✅ 30-day chat log retention
- ✅ Firestore real-time sync

---

## Prerequisites

1. **OpenAI Account** with API access
2. **Firebase Project** with Firestore enabled
3. **Vercel Account** for deployment

---

## Step 1: OpenAI API Setup

### 1.1 Create OpenAI API Key

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Click **"Create new secret key"**
3. Name it: `Dashdice-Whisper-API`
4. Copy the key (you won't see it again!)
5. Store it securely

### 1.2 Add Credits to OpenAI Account

1. Go to [OpenAI Billing](https://platform.openai.com/account/billing/overview)
2. Add at least **$10** in credits
3. Set up usage limits if desired:
   - Soft limit: $50/month
   - Hard limit: $100/month

### 1.3 Pricing Estimate

**Whisper API Pricing:**
- **$0.006** per minute of audio
- Average match (10 minutes with 2 players talking ~30% of time):
  - ~3 minutes total audio per player
  - ~$0.036 per match
  - **~$3.60 per 100 matches**

---

## Step 2: Environment Variables

### 2.1 Local Development (`.env.local`)

Create or update your `.env.local` file:

```bash
# OpenAI Whisper API
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Firebase (existing)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# ... other Firebase config
```

### 2.2 Vercel Production

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `dashdice` project
3. Go to **Settings** → **Environment Variables**
4. Add the following:

| Name | Value | Environment |
|------|-------|-------------|
| `OPENAI_API_KEY` | `sk-proj-xxxxx...` | Production, Preview, Development |

5. Click **Save**
6. **Redeploy** your application for changes to take effect

---

## Step 3: Firebase Setup

### 3.1 Firestore Collections

The following collections are automatically created when the first match chat starts:

- `matchChatSessions` - Chat session metadata
- `matchChatMessages` - Individual messages
- `matchChatExports` - Exported chat logs (30-day retention)

### 3.2 Firestore Security Rules

Security rules have already been added to `firestore.rules`. Deploy them:

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules
```

Or manually copy the rules from `firestore.rules` to Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database** → **Rules**
4. Paste the match chat rules and publish

### 3.3 Firestore Indexes

Create indexes for efficient queries:

```bash
# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

Or create manually in Firebase Console:
1. Go to **Firestore Database** → **Indexes**
2. Create composite index:
   - Collection: `matchChatMessages`
   - Fields: `matchId` (Ascending), `timestamp` (Ascending)

---

## Step 4: Testing

### 4.1 Local Testing

```bash
# Start development server
npm run dev

# Navigate to match page
# Open browser at http://localhost:3000/match?roomId=<match-id>

# Test chat features:
# 1. Press and hold voice button to record
# 2. Release to transcribe
# 3. View messages in chat feed
# 4. Click "Expand" to open full chat overlay
# 5. Test mute controls
```

### 4.2 Production Testing

```bash
# Deploy to Vercel
npm run build
vercel --prod

# Test on production:
# 1. Create a match with a friend
# 2. Both players join the match
# 3. Test voice recording
# 4. Verify real-time message sync
# 5. Check transcription accuracy
```

### 4.3 Verify Transcription

1. Record a short message (3-5 seconds)
2. Check browser console for logs:
   ```
   🎙️ Transcribing audio for match <matchId>
   ✅ Transcription complete in 0.8s
   📝 Transcribed text: "Hello this is a test"
   ```
3. Verify message appears in chat feed
4. Check Firestore for message document

---

## Step 5: Monitoring & Maintenance

### 5.1 OpenAI Usage Monitoring

1. Go to [OpenAI Usage](https://platform.openai.com/usage)
2. Monitor daily spending
3. Check for unusual spikes
4. Review usage by model (Whisper-1)

### 5.2 Firebase Usage Monitoring

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database** → **Usage**
4. Monitor:
   - Document reads/writes
   - Storage size
   - Network egress

### 5.3 Chat Log Cleanup

Chat exports are automatically deleted after 30 days. To manually trigger cleanup:

```typescript
// In Firebase Cloud Function or admin script
import { cleanupExpiredChatExports } from './services/matchChatService';

// Run periodically (e.g., daily cron job)
await cleanupExpiredChatExports();
```

---

## Step 6: Troubleshooting

### Issue: Transcription fails with "Invalid API key"

**Solution:**
1. Verify `OPENAI_API_KEY` in Vercel environment variables
2. Ensure key starts with `sk-proj-` or `sk-`
3. Check key hasn't been revoked in OpenAI dashboard
4. Redeploy after adding/updating key

### Issue: No audio permission in browser

**Solution:**
1. Check browser console for permission errors
2. Ensure site is served over HTTPS (required for mic access)
3. Click browser's mic icon to grant permissions
4. Try different browser (Chrome/Edge recommended)

### Issue: Messages not syncing in real-time

**Solution:**
1. Check Firestore security rules allow read/write
2. Verify both players are authenticated
3. Check browser console for Firestore errors
4. Ensure `matchId` is correct in both clients

### Issue: High transcription costs

**Solution:**
1. Implement rate limiting on voice messages
2. Add cooldown between recordings (e.g., 2 seconds)
3. Set maximum recording duration (e.g., 10 seconds)
4. Consider adding daily usage caps per user

---

## API Endpoints

### POST `/api/transcribe`

Transcribes audio to text using OpenAI Whisper API.

**Request:**
```typescript
FormData {
  audio: File, // Audio blob (webm, mp3, mp4, etc.)
  language: string, // Optional: 'en', 'es', 'fr', etc.
  matchId: string,
  playerId: string
}
```

**Response:**
```typescript
{
  text: string, // Transcribed text
  detectedLanguage: string, // ISO 639-1 language code
  duration: number, // Audio duration in seconds
  processingTime: number // Transcription time in seconds
}
```

**Error Codes:**
- `400` - Missing audio file or required params
- `429` - Rate limit exceeded
- `500` - OpenAI API error or invalid key

---

## Future Enhancements

### Phase 2: Translation Layer
- Add DeepL or Google Translate API
- Auto-translate messages between different languages
- Display both original and translated text

### Phase 3: Moderation
- Scan chat logs for abuse/toxicity
- Auto-mute users with repeated violations
- Admin dashboard for reviewing flagged messages

### Phase 4: Advanced Features
- Voice activity detection (auto start/stop)
- Noise cancellation
- Chat reactions/emojis
- Voice message playback
- Chat history export for users

---

## Support

For issues or questions:
1. Check [OpenAI API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
2. Review [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
3. Contact development team

---

## Cost Summary

**Monthly Estimates (100 matches/day):**
- Whisper API: ~$10.80/month (3,000 matches × $0.036)
- Firebase: ~$5-15/month (depends on usage)
- **Total: ~$15-25/month**

**Break-even:** ~10-20 active users/day

---

**Last Updated:** November 19, 2025
**Version:** 1.0.0
