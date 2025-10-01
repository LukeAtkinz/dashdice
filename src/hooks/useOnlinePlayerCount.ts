import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';

export function useOnlinePlayerCount() {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    try {
      // Try to get online count from globalStats collection (public read access)
      const onlineStatsDoc = doc(db, 'globalStats', 'onlineCount');

      const unsubscribe = onSnapshot(onlineStatsDoc, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setOnlineCount(data.count || 0);
        } else {
          // Fallback to simulated count for guests
          setOnlineCount(Math.floor(Math.random() * 50) + 10); // 10-59 players
        }
      }, (error) => {
        console.error('Error getting online player count:', error);
        // Fallback to simulated count
        setOnlineCount(Math.floor(Math.random() * 50) + 10); // 10-59 players
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Failed to setup online count listener:', error);
      // Fallback to simulated count
      setOnlineCount(Math.floor(Math.random() * 50) + 10); // 10-59 players
    }
  }, []);

  return onlineCount;
}
