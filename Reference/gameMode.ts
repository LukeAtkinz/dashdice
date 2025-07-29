import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface GameModeSettings {
  id: string;
  displayName: string;
  roundObjective: number;
  startingScore: number;
  // Future fields can be added here without breaking existing functionality
  // Example: maxRounds?: number;
  // Example: specialRules?: string[];
}

export class GameModeService {
  private static readonly COLLECTION_NAME = 'gameMode';

  /**
   * Get game mode settings by document ID
   */
  static async getGameModeSettings(gameModeId: string): Promise<GameModeSettings | null> {
    try {
      console.log('🎮 Getting game mode settings for:', gameModeId);
      
      const gameModeDoc = await getDoc(doc(db, this.COLLECTION_NAME, gameModeId));
      if (!gameModeDoc.exists()) {
        console.log('❌ Game mode not found:', gameModeId);
        return null;
      }
      
      const settings = { id: gameModeDoc.id, ...gameModeDoc.data() } as GameModeSettings;
      console.log('✅ Game mode settings retrieved:', settings);
      return settings;
    } catch (error) {
      console.error('❌ Error getting game mode settings:', error);
      throw error;
    }
  }

  /**
   * Get game mode settings by display name (for mapping "Classic Mode" -> "classicMode")
   */
  static async getGameModeSettingsByDisplayName(displayName: string): Promise<GameModeSettings | null> {
    try {
      console.log('🎮 Getting game mode settings by display name:', displayName);
      
      // Map display names to document IDs
      const gameModeMappings: { [key: string]: string } = {
        'Classic Mode': 'classicMode'
        // Future mappings can be added here:
        // 'Speed Mode': 'speedMode',
        // 'Marathon Mode': 'marathonMode'
      };
      
      const documentId = gameModeMappings[displayName];
      if (!documentId) {
        console.log('❌ No mapping found for display name:', displayName);
        return null;
      }
      
      return await this.getGameModeSettings(documentId);
    } catch (error) {
      console.error('❌ Error getting game mode by display name:', error);
      throw error;
    }
  }

  /**
   * Create or update a game mode document
   * This method is primarily for setup/admin purposes
   */
  static async createGameMode(gameModeId: string, settings: Omit<GameModeSettings, 'id'>): Promise<void> {
    try {
      console.log('🎮 Creating/updating game mode:', gameModeId);
      
      await setDoc(doc(db, this.COLLECTION_NAME, gameModeId), settings);
      console.log('✅ Game mode created/updated successfully');
    } catch (error) {
      console.error('❌ Error creating game mode:', error);
      throw error;
    }
  }

  /**
   * Get all available game modes
   */
  static async getAllGameModes(): Promise<GameModeSettings[]> {
    try {
      console.log('🎮 Getting all game modes...');
      
      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      const gameModes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GameModeSettings[];
      
      console.log(`✅ Retrieved ${gameModes.length} game modes`);
      return gameModes;
    } catch (error) {
      console.error('❌ Error getting all game modes:', error);
      throw error;
    }
  }

  /**
   * Initialize default game modes (run once for setup)
   * This method should be called during app initialization or admin setup
   */
  static async initializeDefaultGameModes(): Promise<void> {
    try {
      console.log('🎮 Initializing default game modes...');
      
      // Classic Mode
      await this.createGameMode('classicMode', {
        displayName: 'Classic Mode',
        roundObjective: 2,
        startingScore: 0
      });
      
      console.log('✅ Default game modes initialized');
    } catch (error) {
      console.error('❌ Error initializing default game modes:', error);
      throw error;
    }
  }
}
