'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { InventoryItem, InventoryContextType } from '@/types';
import { useAuth } from './AuthContext';

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

interface InventoryProviderProps {
  children: React.ReactNode;
}

export const InventoryProvider: React.FC<InventoryProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = async (item: Omit<InventoryItem, 'id' | 'acquiredAt'>) => {
    if (!user) {
      throw new Error('User must be logged in to add items');
    }

    try {
      setLoading(true);
      setError(null);

      const newItem: InventoryItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        acquiredAt: new Date(),
      };

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        inventory: arrayUnion(newItem),
      });

      setInventory(prev => [...prev, newItem]);
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item to inventory');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const equipItem = async (itemId: string) => {
    if (!user) {
      throw new Error('User must be logged in to equip items');
    }

    try {
      setLoading(true);
      setError(null);

      const item = inventory.find(item => item.id === itemId);
      if (!item) {
        throw new Error('Item not found in inventory');
      }

      // Update local state
      const updatedInventory = inventory.map(invItem => ({
        ...invItem,
        equipped: invItem.type === item.type ? invItem.id === itemId : invItem.equipped,
      }));

      setInventory(updatedInventory);

      // Update Firestore
      const userRef = doc(db, 'users', user.uid);
      const updateData: any = {
        inventory: updatedInventory,
      };

      // Set equipped background if it's a background item
      if (item.type === 'background') {
        updateData['inventory.displayBackgroundEquipped'] = itemId;
      }

      await updateDoc(userRef, updateData);
    } catch (err) {
      console.error('Error equipping item:', err);
      setError('Failed to equip item');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const unequipItem = async (itemId: string) => {
    if (!user) {
      throw new Error('User must be logged in to unequip items');
    }

    try {
      setLoading(true);
      setError(null);

      const item = inventory.find(item => item.id === itemId);
      if (!item) {
        throw new Error('Item not found in inventory');
      }

      // Update local state
      const updatedInventory = inventory.map(invItem => ({
        ...invItem,
        equipped: invItem.id === itemId ? false : invItem.equipped,
      }));

      setInventory(updatedInventory);

      // Update Firestore
      const userRef = doc(db, 'users', user.uid);
      const updateData: any = {
        inventory: updatedInventory,
      };

      // Clear equipped background if it's a background item
      if (item.type === 'background') {
        updateData['inventory.displayBackgroundEquipped'] = null;
      }

      await updateDoc(userRef, updateData);
    } catch (err) {
      console.error('Error unequipping item:', err);
      setError('Failed to unequip item');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshInventory = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setInventory(userData.inventory || []);
      }
    } catch (err) {
      console.error('Error refreshing inventory:', err);
      setError('Failed to refresh inventory');
    } finally {
      setLoading(false);
    }
  };

  // Listen to user document changes for real-time inventory updates
  useEffect(() => {
    if (!user) {
      setInventory([]);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setInventory(userData.inventory || []);
      }
    }, (err) => {
      console.error('Error listening to inventory changes:', err);
      setError('Failed to sync inventory');
    });

    return unsubscribe;
  }, [user]);

  const value: InventoryContextType = {
    inventory,
    loading,
    error,
    addItem,
    equipItem,
    unequipItem,
    refreshInventory,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
