'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface GuestUser {
  id: string;
  isGuest: true;
  displayName: string;
  createdAt: number;
}

interface GuestContextType {
  guestUser: GuestUser | null;
  isGuest: boolean;
  generateGuestUser: () => void;
  clearGuestUser: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const useGuest = () => {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
};

export const GuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);

  const generateGuestUser = () => {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newGuestUser: GuestUser = {
      id: guestId,
      isGuest: true,
      displayName: `Guest ${Math.floor(Math.random() * 10000)}`,
      createdAt: Date.now(),
    };
    
    setGuestUser(newGuestUser);
    
    // Store in sessionStorage (not localStorage to ensure session-only persistence)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dashDice_guestUser', JSON.stringify(newGuestUser));
    }
  };

  const clearGuestUser = () => {
    setGuestUser(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('dashDice_guestUser');
    }
  };

  // Load guest user from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedGuestUser = sessionStorage.getItem('dashDice_guestUser');
      if (storedGuestUser) {
        try {
          const parsedGuestUser = JSON.parse(storedGuestUser);
          setGuestUser(parsedGuestUser);
        } catch (error) {
          console.error('Error parsing stored guest user:', error);
          sessionStorage.removeItem('dashDice_guestUser');
        }
      }
    }
  }, []);

  const isGuest = guestUser !== null;

  return (
    <GuestContext.Provider value={{
      guestUser,
      isGuest,
      generateGuestUser,
      clearGuestUser
    }}>
      {children}
    </GuestContext.Provider>
  );
};