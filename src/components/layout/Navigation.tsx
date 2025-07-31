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
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className="flex-shrink-0 flex items-center gap-2 text-xl font-bold text-white hover:text-yellow-400 transition-colors"
              style={{ fontFamily: "Audiowide" }}
            >
              <img
                src="/Design Elements/CrownLogo.webp"
                alt="Dashdice Logo"
                className="w-8 h-8"
              />
              Dashdice
            </Link>
            
            {user && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
                <Link
                  href="/dashboard"
                  className="px-3 py-2 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  style={{ fontFamily: "Audiowide" }}
                >
                  Dashboard
                </Link>
                <Link
                  href="/inventory"
                  className="px-3 py-2 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  style={{ fontFamily: "Audiowide" }}
                >
                  Vault
                </Link>
                <Link
                  href="/match"
                  className="px-3 py-2 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  style={{ fontFamily: "Audiowide" }}
                >
                  Match
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
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
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
