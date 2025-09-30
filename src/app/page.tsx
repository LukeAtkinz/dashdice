'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import GuestDashboard from "@/components/layout/GuestDashboard";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is authenticated and not loading, redirect to dashboard
    if (!loading && user) {
      router.push('/dashboard');
      return;
    }
  }, [user, loading, router]);

  // If loading auth state, show loading
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </Layout>
    );
  }

  // If not authenticated, show guest dashboard
  if (!user) {
    return <GuestDashboard />;
  }

  // This should not render since authenticated users are redirected
  return null;
}
