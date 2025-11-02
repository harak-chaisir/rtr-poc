import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Navbar } from '@/components/Navbar';
import { UserManagement } from '@/components/admin/UserManagement';

export const metadata: Metadata = {
  title: 'User Management | RTR Admin',
  description: 'Manage RTR users and permissions',
};

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated
  if (!session) {
    redirect('/login?callbackUrl=/admin/users');
  }

  // Check if user has Admin role
  const userRoles = session.user?.roles || [];
  if (!userRoles.includes('Admin')) {
    redirect('/dashboard?error=forbidden&message=Admin access required');
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <Navbar />
      
      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage RTR users with role-based access control
            </p>
          </div>

          {/* User Management Component */}
          <UserManagement />
        </div>
      </main>
    </div>
  );
}
