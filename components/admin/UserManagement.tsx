'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  Users,
  Plus,
  Search,
  Edit,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { UserResponse, Role, UserStatus } from '@/types/user-registration';

interface UserListResponse {
  users: UserResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function UserManagement() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/admin/users?${queryParams}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const data: UserListResponse = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getRoleBadgeVariant = (role: Role): 'default' | 'secondary' | 'destructive' => {
    switch (role) {
      case 'Admin':
        return 'destructive';
      case 'Payment_Admin':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusBadge = (status: UserStatus, isActive: boolean) => {
    if (!isActive || status !== 'active') {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Inactive
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            {/* Search */}
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Create User Button */}
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create User
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create User Form */}
      {showCreateForm && (
        <CreateUserForm
          onSuccess={(message) => {
            setSuccess(message);
            setShowCreateForm(false);
            fetchUsers();
            setTimeout(() => setSuccess(null), 5000);
          }}
          onCancel={() => setShowCreateForm(false)}
          onError={(message) => setError(message)}
        />
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({pagination.total})
          </CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No users found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Username</th>
                      <th className="text-left py-3 px-4 font-medium">Name</th>
                      <th className="text-left py-3 px-4 font-medium">Email</th>
                      <th className="text-left py-3 px-4 font-medium">Roles</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Created</th>
                      <th className="text-right py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-sm">{user.username}</td>
                        <td className="py-3 px-4">{user.name || '-'}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{user.email || '-'}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <Badge key={role} variant={getRoleBadgeVariant(role)}>
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(user.status, user.isActive)}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => {/* TODO: Edit user */}}
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-6 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Create User Form Component
interface CreateUserFormProps {
  onSuccess: (message: string) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

function CreateUserForm({ onSuccess, onCancel, onError }: CreateUserFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    name: '',
    roles: ['Viewer'] as Role[],
  });
  const [submitting, setSubmitting] = useState(false);

  const availableRoles: Role[] = ['Admin', 'Booker', 'Payment_Admin', 'Viewer'];

  const toggleRole = (role: Role) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    onError('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const data = await response.json();
      onSuccess(data.message || 'User created successfully');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New User</CardTitle>
        <CardDescription>
          Register a new user in both FastTrak and RTR systems
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="john.doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Min 8 characters"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Roles *</Label>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map((role) => (
                <Badge
                  key={role}
                  variant={formData.roles.includes(role) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleRole(role)}
                >
                  {role}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Click to select/deselect roles. At least one role is required.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || formData.roles.length === 0}
              className="gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
