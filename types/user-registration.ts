/**
 * User Registration Types
 * Types and interfaces for user management and registration
 */

import type { Role, UserStatus } from '@/lib/models/User';

// Re-export types from model for convenience
export type { Role, UserStatus };

/**
 * Request payload for creating a new user
 */
export interface CreateUserRequest {
  username: string;
  password: string;
  email: string;
  name: string;
  roles: Role[];
}

/**
 * Request payload for updating a user
 */
export interface UpdateUserRequest {
  name?: string;
  email?: string;
  roles?: Role[];
  status?: UserStatus;
}

/**
 * User response (safe for API responses - no sensitive data)
 */
export interface UserResponse {
  id: string;
  fasttrakId: string;
  username: string;
  email: string;
  name: string;
  roles: Role[];
  status: UserStatus;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastSeen?: Date;
}

/**
 * Paginated user list response
 */
export interface UserListResponse {
  users: UserResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * User list query parameters
 */
export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
  status?: UserStatus;
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastSeen';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Audit log entry for user operations
 */
export interface UserAuditLog {
  userId: string;
  action: 'create' | 'update' | 'deactivate' | 'activate' | 'role_change';
  performedBy: string;
  changes?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
}
