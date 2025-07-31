'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

export const Navigation: React.FC = () => {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-black/20 backdrop-blur-md shadow-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link
              href="/"
              className="flex-shrink-0 flex items-center gap-3 text-2xl font-bold text-white hover:text-yellow-400 transition-colors"
              style={{ fontFamily: "Audiowide" }}
            >
              <img
                src="/Design Elements/CrownLogo.webp"
                alt="Dashdice Logo"
                className="w-12 h-12"
              />
              Dashdice
            </Link>
            
            {user && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-6">
                <Link
                  href="/dashboard"
                  className="px-4 py-3 rounded-md text-lg font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  style={{ fontFamily: "Audiowide" }}
                >
                  Dashboard
                </Link>
                <Link
                  href="/inventory"
                  className="px-4 py-3 rounded-md text-lg font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  style={{ fontFamily: "Audiowide" }}
                >
                  Vault
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="animate-pulse h-8 w-20 bg-gray-200 rounded"></div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-white/80" style={{ fontFamily: "Audiowide" }}>
                  Welcome, {user.displayName || user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-white border-white/30 hover:bg-white/10"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 font-bold px-6 py-3"
                    style={{ fontFamily: "Audiowide" }}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border-none hover:from-yellow-500 hover:to-yellow-700 font-bold shadow-lg px-6 py-3"
                    style={{ fontFamily: "Audiowide" }}
                  >
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
