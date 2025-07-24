import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { InventoryItem } from '@/types';

export class InventoryService {
  private static readonly COLLECTION_NAME = 'inventory';

  /**
   * Get all inventory items for a user
   */
  static async getUserInventory(userId: string): Promise<InventoryItem[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('acquiredAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        acquiredAt: doc.data().acquiredAt?.toDate() || new Date(),
      })) as InventoryItem[];
    } catch (error) {
      console.error('Error fetching user inventory:', error);
      throw error;
    }
  }

  /**
   * Add an item to user's inventory
   */
  static async addItemToInventory(
    userId: string, 
    item: Omit<InventoryItem, 'id' | 'acquiredAt'>
  ): Promise<string> {
    try {
      const inventoryItem = {
        ...item,
        userId,
        acquiredAt: serverTimestamp(),
        equipped: false,
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), inventoryItem);
      return docRef.id;
    } catch (error) {
      console.error('Error adding item to inventory:', error);
      throw error;
    }
  }

  /**
   * Update an inventory item
   */
  static async updateInventoryItem(
    itemId: string, 
    updates: Partial<InventoryItem>
  ): Promise<void> {
    try {
      const itemRef = doc(db, this.COLLECTION_NAME, itemId);
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  }

  /**
   * Delete an inventory item
   */
  static async deleteInventoryItem(itemId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, itemId));
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  }

  /**
   * Equip an item (and unequip others of the same type)
   */
  static async equipItem(userId: string, itemId: string): Promise<void> {
    try {
      // First, get the item to know its type
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const userItems = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (InventoryItem & { id: string })[];

      const itemToEquip = userItems.find(item => item.id === itemId);
      if (!itemToEquip) {
        throw new Error('Item not found in user inventory');
      }

      // Unequip all items of the same type
      const sameTypeItems = userItems.filter(item => 
        item.type === itemToEquip.type && item.equipped
      );

      // Update all items in batch
      const updates: Promise<void>[] = [];

      // Unequip same type items
      sameTypeItems.forEach(item => {
        if (item.id !== itemId) {
          updates.push(this.updateInventoryItem(item.id, { equipped: false }));
        }
      });

      // Equip the target item
      updates.push(this.updateInventoryItem(itemId, { equipped: true }));

      await Promise.all(updates);
    } catch (error) {
      console.error('Error equipping item:', error);
      throw error;
    }
  }

  /**
   * Unequip an item
   */
  static async unequipItem(itemId: string): Promise<void> {
    try {
      await this.updateInventoryItem(itemId, { equipped: false });
    } catch (error) {
      console.error('Error unequipping item:', error);
      throw error;
    }
  }

  /**
   * Get equipped items for a user
   */
  static async getEquippedItems(userId: string): Promise<InventoryItem[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('equipped', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        acquiredAt: doc.data().acquiredAt?.toDate() || new Date(),
      })) as InventoryItem[];
    } catch (error) {
      console.error('Error fetching equipped items:', error);
      throw error;
    }
  }
}
