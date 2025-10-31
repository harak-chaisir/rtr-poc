import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { AuthButton } from '@/components/auth/AuthButton';
import { Badge } from '@/components/ui/Badge';
import { User, Shield, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard | RTR Authentication',
  description: 'User dashboard for authenticated users',
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const customSession = session;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">RTR Dashboard</h1>
          </div>
          <AuthButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Welcome Card */}
          <Card className="md:col-span-2 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Welcome Back!
              </CardTitle>
              <CardDescription>
                You are successfully authenticated with FastTrak
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-lg">{user?.name || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-lg">{user?.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">FastTrak ID</p>
                  <p className="text-lg font-mono">{user?.id || 'Not available'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Session Status</p>
                  <Badge variant={customSession.error ? 'destructive' : 'default'}>
                    {customSession.error ? 'Token Error' : 'Active'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roles Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                User Roles
              </CardTitle>
              <CardDescription>
                Your current access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {user?.roles && user.roles.length > 0 ? (
                  user.roles.map((role: string) => (
                    <Badge key={role} variant="secondary" className="mr-2">
                      {role}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No roles assigned</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Session Info Card */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Session Information
              </CardTitle>
              <CardDescription>
                Technical details about your current session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Session Expires</p>
                  <p>{new Date(session.expires).toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Access Token</p>
                  <p className="font-mono text-xs">
                    {customSession.accessToken ? '••••••••••••••••' : 'Not available'}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Token Status</p>
                  <Badge variant={customSession.error ? 'destructive' : 'default'}>
                    {customSession.error ? customSession.error : 'Valid'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}