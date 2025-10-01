'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ScrollablePageWrapper } from '@/components/pages/ScrollablePageWrapper';
import { LoginPageComponent } from '@/components/pages/LoginPageComponent';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <ScrollablePageWrapper>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent mb-4"></div>
          <p className="text-white text-lg" style={{ fontFamily: "Audiowide" }}>Loading...</p>
        </div>
      </ScrollablePageWrapper>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <ScrollablePageWrapper>
      <LoginPageComponent />
    </ScrollablePageWrapper>
  );
}
