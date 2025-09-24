'use client';

import { useAuth } from '@/context/AuthContext';
import SinglePageDashboard from '@/components/layout/SinglePageDashboard';
import AppWithSplash from '@/components/AppWithSplash';

export default function DashboardPage() {
  return (
    <AppWithSplash>
      <SinglePageDashboard />
    </AppWithSplash>
  );
}
