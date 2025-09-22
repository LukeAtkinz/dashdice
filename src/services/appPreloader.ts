/**
 * App Preloader Service
 * Preloads all critical app resources during splash screen for seamless user experience
 */

import { auth, db } from '@/services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';

interface PreloadProgress {
  step: string;
  progress: number; // 0-100
  total: number;
  current: number;
}

type PreloadCallback = (progress: PreloadProgress) => void;

class AppPreloaderService {
  private static instance: AppPreloaderService;
  private preloadPromises: Promise<any>[] = [];
  private progressCallback?: PreloadCallback;
  private totalSteps = 8;
  private completedSteps = 0;

  private constructor() {}

  static getInstance(): AppPreloaderService {
    if (!AppPreloaderService.instance) {
      AppPreloaderService.instance = new AppPreloaderService();
    }
    return AppPreloaderService.instance;
  }

  /**
   * Start preloading all app resources
   */
  async preloadApp(onProgress?: PreloadCallback): Promise<void> {
    this.progressCallback = onProgress;
    this.completedSteps = 0;
    this.preloadPromises = [];

    try {
      // Step 1: Preload critical images and assets
      this.updateProgress('Loading assets...', 1);
      this.preloadPromises.push(this.preloadCriticalAssets());

      // Step 2: Initialize Firebase connection
      this.updateProgress('Connecting to Firebase...', 2);
      this.preloadPromises.push(this.initializeFirebase());

      // Step 3: Preload user authentication state
      this.updateProgress('Checking authentication...', 3);
      this.preloadPromises.push(this.preloadAuthState());

      // Step 4: Preload game assets
      this.updateProgress('Loading game assets...', 4);
      this.preloadPromises.push(this.preloadGameAssets());

      // Step 5: Preload component dependencies
      this.updateProgress('Loading components...', 5);
      this.preloadPromises.push(this.preloadComponents());

      // Step 6: Preload API connections
      this.updateProgress('Testing API connections...', 6);
      this.preloadPromises.push(this.preloadAPIConnections());

      // Step 7: Preload user data (if authenticated)
      this.updateProgress('Loading user data...', 7);
      this.preloadPromises.push(this.preloadUserData());

      // Step 8: Final preparations
      this.updateProgress('Finalizing...', 8);
      this.preloadPromises.push(this.finalPreparations());

      // Wait for all preloading to complete
      await Promise.allSettled(this.preloadPromises);
      
      this.updateProgress('Ready!', this.totalSteps);

    } catch (error) {
      console.warn('Preloading completed with some warnings:', error);
      // Don't throw error - app should still work even if preloading partially fails
    }
  }

  /**
   * Preload critical visual assets
   */
  private async preloadCriticalAssets(): Promise<void> {
    const criticalImages = [
      '/images/CrownLogo.png',
      '/images/Delivery_Man.png',
      '/images/friends.png',
      '/images/Ranked.png',
      '/images/Vault.png',
      '/images/dice/1.png',
      '/images/dice/2.png',
      '/images/dice/3.png',
      '/images/dice/4.png',
      '/images/dice/5.png',
      '/images/dice/6.png',
      '/icons/icon-192.webp',
    ];

    const imagePreloadPromises = criticalImages.map(src => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => {
          console.warn(`Failed to preload image: ${src}`);
          resolve(); // Don't fail entire preload for one image
        };
        img.src = src;
      });
    });

    await Promise.allSettled(imagePreloadPromises);
  }

  /**
   * Initialize Firebase services
   */
  private async initializeFirebase(): Promise<void> {
    // Firebase is already initialized in the import, but we can test the connection
    try {
      // Test Firestore connection
      await getDocs(query(collection(db, 'users'), limit(1)));
    } catch (error) {
      console.warn('Firebase initialization check failed:', error);
    }
  }

  /**
   * Preload authentication state
   */
  private async preloadAuthState(): Promise<void> {
    return new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        // Auth state loaded
        unsubscribe();
        resolve();
      });
      
      // Timeout after 3 seconds
      setTimeout(() => {
        unsubscribe();
        resolve();
      }, 3000);
    });
  }

  /**
   * Preload game-specific assets
   */
  private async preloadGameAssets(): Promise<void> {
    const gameAssets = [
      '/sounds/dice-roll.mp3',
      '/sounds/victory.mp3',
      '/sounds/notification.mp3',
    ];

    const audioPreloadPromises = gameAssets.map(src => {
      return new Promise<void>((resolve) => {
        if (typeof Audio !== 'undefined') {
          const audio = new Audio();
          audio.oncanplaythrough = () => resolve();
          audio.onerror = () => {
            console.warn(`Failed to preload audio: ${src}`);
            resolve();
          };
          audio.src = src;
          audio.load();
        } else {
          resolve();
        }
      });
    });

    await Promise.allSettled(audioPreloadPromises);
  }

  /**
   * Preload React components (dynamic imports)
   */
  private async preloadComponents(): Promise<void> {
    const componentPreloads = [
      // Preload critical page components
      import('@/components/dashboard/DashboardSectionNew'),
      import('@/components/dashboard/InventorySection'),
    ];

    await Promise.allSettled(componentPreloads);
  }

  /**
   * Test API connections
   */
  private async preloadAPIConnections(): Promise<void> {
    try {
      // Test Go services connection
      const apiUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
      if (apiUrl) {
        const response = await fetch(`${apiUrl}/health`, {
          method: 'GET',
          timeout: 2000,
        } as any);
        if (!response.ok) {
          console.warn('Go services not available');
        }
      }
    } catch (error) {
      console.warn('API connection test failed:', error);
    }
  }

  /**
   * Preload user-specific data if authenticated
   */
  private async preloadUserData(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (user) {
        // Preload user profile
        const userDocRef = doc(db, 'users', user.uid);
        await getDoc(userDocRef);

        // Preload user stats
        const statsDocRef = doc(db, 'userStats', user.uid);
        await getDoc(statsDocRef);

        // Preload recent achievements
        const achievementsQuery = query(
          collection(db, 'userAchievements'),
          limit(10)
        );
        await getDocs(achievementsQuery);
      }
    } catch (error) {
      console.warn('User data preload failed:', error);
    }
  }

  /**
   * Final preparations
   */
  private async finalPreparations(): Promise<void> {
    // Small delay to ensure smooth transition
    await new Promise(resolve => setTimeout(resolve, 500));

    // Initialize any remaining services
    try {
      // Warm up localStorage cache
      localStorage.setItem('app_preloaded', Date.now().toString());
      
      // Clear any old cache if needed
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => name.includes('old') || name.includes('expired'));
        await Promise.all(oldCaches.map(name => caches.delete(name)));
      }
    } catch (error) {
      console.warn('Final preparations warning:', error);
    }
  }

  /**
   * Update progress and notify callback
   */
  private updateProgress(step: string, current: number): void {
    this.completedSteps = current;
    const progress = Math.round((current / this.totalSteps) * 100);
    
    if (this.progressCallback) {
      this.progressCallback({
        step,
        progress,
        total: this.totalSteps,
        current
      });
    }
  }

  /**
   * Check if app has been preloaded recently
   */
  static isRecentlyPreloaded(): boolean {
    try {
      const lastPreload = localStorage.getItem('app_preloaded');
      if (lastPreload) {
        const lastTime = parseInt(lastPreload);
        const now = Date.now();
        // Consider recently preloaded if within last hour
        return (now - lastTime) < (60 * 60 * 1000);
      }
    } catch (error) {
      console.warn('Failed to check preload status:', error);
    }
    return false;
  }
}

export default AppPreloaderService;
export type { PreloadProgress };
