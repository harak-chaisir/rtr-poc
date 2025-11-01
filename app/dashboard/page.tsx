import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Navbar } from '@/components/Navbar';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { 
  User, 
  Shield, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Key,
  Calendar,
  Activity,
  ArrowUpRight
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard | RTR Authentication',
  description: 'User dashboard for authenticated users',
};

interface DashboardPageProps {
  searchParams: { error?: string; message?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const customSession = session;
  
  // Get error and message from query params (from middleware redirects)
  const { error, message } = await searchParams;
  
  // Calculate session time remaining
  const expiresAt = new Date(session.expires);
  const now = new Date();
  const timeRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000 / 60));

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error Alert */}
        {error && message && (
          <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{error === 'unauthorized' ? 'Access Denied' : 'Forbidden'}:</strong> {message}
            </AlertDescription>
          </Alert>
        )}

        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/10 via-primary/5 to-background p-8 shadow-sm">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h2>
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-muted-foreground max-w-2xl">
                  You&apos;re successfully authenticated with FastTrak. Your session is active and secure.
                </p>
              </div>
              <Badge 
                variant={customSession.error ? 'destructive' : 'default'} 
                className="animate-pulse"
              >
                <Activity className="h-3 w-3 mr-1" />
                {customSession.error ? 'Error' : 'Live'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Session Status */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Session Status</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customSession.error ? 'Error' : 'Active'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Authenticated session
              </p>
            </CardContent>
          </Card>

          {/* Time Remaining */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Remaining</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timeRemaining}m</div>
              <p className="text-xs text-muted-foreground mt-1">
                Until session expires
              </p>
            </CardContent>
          </Card>

          {/* Active Roles */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
              <Shield className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {user?.roles?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Access permissions
              </p>
            </CardContent>
          </Card>

          {/* Security Level */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security</CardTitle>
              <Key className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customSession.accessToken ? 'High' : 'Low'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Token encryption
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* User Profile Card */}
          <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    User Profile
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    Your account information and details
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</p>
                  <p className="text-lg font-semibold">{user?.name || 'Not provided'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Address</p>
                  <p className="text-lg font-semibold truncate">{user?.email || 'Not provided'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">FastTrak ID</p>
                  <p className="text-lg font-mono font-semibold">{user?.id || 'Not available'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account Type</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold">Authenticated</p>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roles Card */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                  <Shield className="h-5 w-5 text-purple-500" />
                </div>
                <span>Access Roles</span>
              </CardTitle>
              <CardDescription>
                Your permissions and capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {user?.roles && user.roles.length > 0 ? (
                  <>
                    {user.roles.map((role: string) => (
                      <div 
                        key={role}
                        className="flex items-center justify-between rounded-lg border bg-muted/50 p-3 transition-colors hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="font-medium">{role}</span>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground mt-4">
                      {user.roles.length} {user.roles.length === 1 ? 'role' : 'roles'} assigned
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Shield className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No roles assigned</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Session Details Card */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              Session Details
            </CardTitle>
            <CardDescription>
              Technical information about your current authentication session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expires At</p>
                </div>
                <p className="text-sm font-semibold">{expiresAt.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {timeRemaining > 0 ? `${timeRemaining} minutes remaining` : 'Expired'}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Access Token</p>
                </div>
                <p className="text-sm font-mono">
                  {customSession.accessToken ? '••••••••••••••••••••' : 'Not available'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {customSession.accessToken ? 'Encrypted & secure' : 'No token available'}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Token Status</p>
                </div>
                <div>
                  <Badge 
                    variant={customSession.error ? 'destructive' : 'default'}
                    className="text-sm"
                  >
                    {customSession.error ? customSession.error : 'Valid & Active'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {customSession.error ? 'Authentication error' : 'Automatically refreshed'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}