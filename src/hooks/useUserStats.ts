import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';

interface UserStats {
  bestStreak: number;
  currentStreak: number;
  gamesPlayed: number;
  matchWins: number;
  itemsCollected?: number; // Calculated from inventory
}

interface UseUserStatsReturn {
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
}

export const useUserStats = (): UseUserStatsReturn => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setStats(null);
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    
    const unsubscribe = onSnapshot(
      userRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          
          // Calculate items collected from inventory - handle both old and new formats
          const inventory = userData.inventory || {};
          // Check both new format (inventory.ownedBackgrounds) and legacy format (userData.ownedBackgrounds)
          const ownedBackgrounds = inventory.ownedBackgrounds || userData.ownedBackgrounds || [];
          const inventoryItems = userData.inventoryItems || [];
          const itemsCollected = ownedBackgrounds.length + inventoryItems.length;
          
          const userStats: UserStats = {
            bestStreak: userData.stats?.bestStreak || 0,
            currentStreak: userData.stats?.currentStreak || 0,
            gamesPlayed: userData.stats?.gamesPlayed || 0,
            matchWins: userData.stats?.matchWins || 0,
            itemsCollected
          };
          
          setStats(userStats);
          setError(null);
        } else {
          // User document doesn't exist, set default stats
          setStats({
            bestStreak: 0,
            currentStreak: 0,
            gamesPlayed: 0,
            matchWins: 0,
            itemsCollected: 0
          });
          setError(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to user stats:', err);
        setError('Failed to load user statistics');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  return { stats, loading, error };
};
