'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GuestDashboard from '@/components/layout/GuestDashboard';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // If user is authenticated, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // If user is authenticated, show nothing (will redirect to dashboard)
  if (user) {
    return null;
  }

  // Show guest dashboard for non-authenticated users (no splash needed for guest)
  return <GuestDashboard />;
}
