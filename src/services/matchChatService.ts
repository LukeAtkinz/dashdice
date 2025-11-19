import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  getDocs,
  where,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { MatchChatMessage, MatchChatSession, MatchChatExportData } from '../types/chat';

const CHAT_SESSIONS_COLLECTION = 'matchChatSessions';
const CHAT_MESSAGES_COLLECTION = 'matchChatMessages';
const CHAT_EXPORTS_COLLECTION = 'matchChatExports';
const RETENTION_DAYS = 30;

/**
 * Start a new match chat session
 */
export async function startMatchChatSession(
  matchId: string,
  player1Id: string,
  player2Id: string,
  player1DisplayName: string,
  player2DisplayName: string,
  player1Language: string = 'en',
  player2Language: string = 'en'
): Promise<MatchChatSession> {
  try {
    const sessionData: Omit<MatchChatSession, 'id'> = {
      matchId,
      player1Id,
      player2Id,
      player1DisplayName,
      player2DisplayName,
      player1Language,
      player2Language,
      startedAt: Date.now(),
      messageCount: 0,
      isActive: true
    };

    // Use matchId as document ID for easy lookup
    const sessionRef = doc(db, CHAT_SESSIONS_COLLECTION, matchId);
    await updateDoc(sessionRef, sessionData as any).catch(async () => {
      // If document doesn't exist, create it
      await addDoc(collection(db, CHAT_SESSIONS_COLLECTION), {
        id: matchId,
        ...sessionData
      });
    });

    console.log('✅ Match chat session started:', matchId);
    return { id: matchId, ...sessionData };
  } catch (error) {
    console.error('❌ Error starting match chat session:', error);
    throw error;
  }
}

/**
 * Send a message to match chat
 */
export async function sendMatchChatMessage(
  matchId: string,
  fromUserId: string,
  fromDisplayName: string,
  text: string,
  language: string = 'en',
  isVoice: boolean = false,
  audioTranscriptionDuration?: number
): Promise<string> {
  try {
    // Determine player position (player1 or player2)
    const sessionRef = doc(db, CHAT_SESSIONS_COLLECTION, matchId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (!sessionSnap.exists()) {
      throw new Error('Match chat session not found');
    }

    const session = sessionSnap.data() as MatchChatSession;
    const from = session.player1Id === fromUserId ? 'player1' : 'player2';

    const messageData: Omit<MatchChatMessage, 'id'> = {
      matchId,
      from,
      fromUserId,
      fromDisplayName,
      userId: fromUserId,
      username: fromDisplayName,
      content: text,
      originalText: text,
      language,
      isVoice,
      audioTranscriptionDuration,
      timestamp: Timestamp.now(),
      isModerated: false
    };

    const messageRef = await addDoc(collection(db, CHAT_MESSAGES_COLLECTION), messageData);

    // Increment message count in session
    await updateDoc(sessionRef, {
      messageCount: (session.messageCount || 0) + 1,
      lastActivity: serverTimestamp()
    });

    console.log(`📨 Message sent to match ${matchId}:`, text.substring(0, 50));
    return messageRef.id;
  } catch (error) {
    console.error('❌ Error sending match chat message:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time match chat messages
 */
export function subscribeToMatchChat(
  matchId: string,
  onMessage: (message: MatchChatMessage) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const messagesQuery = query(
      collection(db, CHAT_MESSAGES_COLLECTION),
      where('matchId', '==', matchId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const message = {
              id: change.doc.id,
              ...change.doc.data()
            } as MatchChatMessage;
            onMessage(message);
          }
        });
      },
      (error) => {
        console.error('❌ Error in match chat subscription:', error);
        onError?.(error);
      }
    );

    console.log('🔔 Subscribed to match chat:', matchId);
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error subscribing to match chat:', error);
    throw error;
  }
}

/**
 * End match chat session and export chat log
 */
export async function endMatchChatSession(matchId: string): Promise<string | null> {
  try {
    const sessionRef = doc(db, CHAT_SESSIONS_COLLECTION, matchId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      console.warn('⚠️ Match chat session not found:', matchId);
      return null;
    }

    const session = sessionSnap.data() as MatchChatSession;

    // Mark session as ended
    await updateDoc(sessionRef, {
      endedAt: Date.now(),
      isActive: false
    });

    // Export chat log
    const exportId = await exportMatchChat(matchId, session);

    console.log('✅ Match chat session ended:', matchId);
    return exportId;
  } catch (error) {
    console.error('❌ Error ending match chat session:', error);
    throw error;
  }
}

/**
 * Export match chat to permanent storage
 */
async function exportMatchChat(
  matchId: string,
  session: MatchChatSession
): Promise<string> {
  try {
    // Get all messages for this match
    const messagesQuery = query(
      collection(db, CHAT_MESSAGES_COLLECTION),
      where('matchId', '==', matchId),
      orderBy('timestamp', 'asc')
    );

    const messagesSnap = await getDocs(messagesQuery);
    const messages: MatchChatMessage[] = messagesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MatchChatMessage));

    const totalVoiceMessages = messages.filter(m => m.isVoice).length;
    const totalTextMessages = messages.filter(m => !m.isVoice).length;

    const exportData: MatchChatExportData = {
      matchId,
      player1: {
        id: session.player1Id,
        displayName: session.player1DisplayName,
        language: session.player1Language
      },
      player2: {
        id: session.player2Id,
        displayName: session.player2DisplayName,
        language: session.player2Language
      },
      startTime: session.startedAt,
      endTime: session.endedAt || Date.now(),
      messages,
      exportedAt: Date.now(),
      totalVoiceMessages,
      totalTextMessages
    };

    // Save export
    const exportRef = await addDoc(collection(db, CHAT_EXPORTS_COLLECTION), exportData);

    // Schedule deletion after retention period
    const deleteAfter = Date.now() + (RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await updateDoc(exportRef, {
      deleteAfter
    });

    console.log('📦 Chat exported:', exportRef.id);
    return exportRef.id;
  } catch (error) {
    console.error('❌ Error exporting match chat:', error);
    throw error;
  }
}

/**
 * Get chat export as downloadable text file content
 */
export async function getMatchChatExport(exportId: string): Promise<string> {
  try {
    const exportRef = doc(db, CHAT_EXPORTS_COLLECTION, exportId);
    const exportSnap = await getDoc(exportRef);

    if (!exportSnap.exists()) {
      throw new Error('Chat export not found');
    }

    const exportData = exportSnap.data() as MatchChatExportData;

    // Generate formatted text file content
    let content = '='.repeat(60) + '\n';
    content += 'DASHDICE MATCH CHAT LOG\n';
    content += '='.repeat(60) + '\n\n';
    content += `Match ID: ${exportData.matchId}\n`;
    content += `Start Time: ${new Date(exportData.startTime).toISOString()}\n`;
    content += `End Time: ${new Date(exportData.endTime).toISOString()}\n\n`;
    content += `Player 1: ${exportData.player1.displayName} (${exportData.player1.id})\n`;
    content += `Language: ${exportData.player1.language}\n\n`;
    content += `Player 2: ${exportData.player2.displayName} (${exportData.player2.id})\n`;
    content += `Language: ${exportData.player2.language}\n\n`;
    content += `Total Messages: ${exportData.messages.length}\n`;
    content += `Voice Messages: ${exportData.totalVoiceMessages}\n`;
    content += `Text Messages: ${exportData.totalTextMessages}\n\n`;
    content += '='.repeat(60) + '\n';
    content += 'MESSAGES\n';
    content += '='.repeat(60) + '\n\n';

    exportData.messages.forEach((msg, index) => {
      const timestamp = new Date((msg.timestamp as any).seconds * 1000).toISOString();
      const type = msg.isVoice ? '[VOICE]' : '[TEXT]';
      content += `[${index + 1}] ${timestamp} ${type}\n`;
      content += `From: ${msg.fromDisplayName} (${msg.from})\n`;
      content += `Language: ${msg.language}\n`;
      content += `Original: ${msg.originalText}\n`;
      if (msg.translatedText) {
        content += `Translated: ${msg.translatedText}\n`;
      }
      if (msg.audioTranscriptionDuration) {
        content += `Audio Duration: ${msg.audioTranscriptionDuration.toFixed(2)}s\n`;
      }
      content += '\n';
    });

    content += '='.repeat(60) + '\n';
    content += `Exported: ${new Date(exportData.exportedAt).toISOString()}\n`;
    content += '='.repeat(60) + '\n';

    return content;
  } catch (error) {
    console.error('❌ Error getting match chat export:', error);
    throw error;
  }
}

/**
 * Clean up expired chat exports (run periodically)
 */
export async function cleanupExpiredChatExports(): Promise<number> {
  try {
    const now = Date.now();
    const exportsQuery = query(
      collection(db, CHAT_EXPORTS_COLLECTION),
      where('deleteAfter', '<=', now)
    );

    const exportsSnap = await getDocs(exportsQuery);
    
    if (exportsSnap.empty) {
      return 0;
    }

    const batch = writeBatch(db);
    exportsSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`🗑️ Cleaned up ${exportsSnap.size} expired chat exports`);
    return exportsSnap.size;
  } catch (error) {
    console.error('❌ Error cleaning up expired chat exports:', error);
    throw error;
  }
}
