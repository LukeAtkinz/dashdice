import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';

export function useOnlinePlayerCount() {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    // Consider a user online if they've been active in the last 5 minutes
    const fiveMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000));
    
    const onlineUsersQuery = query(
      collection(db, 'users'),
      where('lastSeen', '>=', fiveMinutesAgo)
    );

    const unsubscribe = onSnapshot(onlineUsersQuery, (snapshot) => {
      setOnlineCount(snapshot.size);
    }, (error) => {
      console.error('Error getting online player count:', error);
      setOnlineCount(0);
    });

    return () => unsubscribe();
  }, []);

  return onlineCount;
}
