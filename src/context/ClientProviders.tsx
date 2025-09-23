'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the Providers with no SSR to prevent Firebase initialization during static generation
const Providers = dynamic(() => import('./Providers').then(mod => ({ default: mod.Providers })), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-gray-900"></div>
});

interface ClientProvidersProps {
  children: React.ReactNode;
}

export const ClientProviders: React.FC<ClientProvidersProps> = ({ children }) => {
  return (
    <Providers>
      {children}
    </Providers>
  );
};