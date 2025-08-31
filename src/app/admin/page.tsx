import AdminUtilities from '@/components/admin/AdminUtilities';

/**
 * Admin Dashboard Page
 * Provides access to system administration tools
 * 
 * Access this page at: /admin
 * 
 * SECURITY NOTE: In production, this should be protected by admin authentication
 */
export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <AdminUtilities />
    </div>
  );
}
