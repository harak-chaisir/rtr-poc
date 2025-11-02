import { z } from 'zod';

/**
 * Validation Schemas for User Management
 * Using Zod for runtime type checking and validation
 */

/**
 * User role enum schema
 */
export const RoleSchema = z.enum(['Admin', 'Booker', 'Payment_Admin', 'Viewer'], {
  message: 'Invalid role. Must be Admin, Booker, Payment_Admin, or Viewer',
});

/**
 * User status enum schema
 */
export const UserStatusSchema = z.enum(['active', 'inactive', 'suspended'], {
  message: 'Invalid status. Must be active, inactive, or suspended',
});

/**
 * Username validation rules
 */
const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must be less than 50 characters')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dots, underscores, and hyphens')
  .trim();

/**
 * Password validation rules
 * Requires: min 8 chars, 1 uppercase, 1 lowercase, 1 number
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Email validation
 */
const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .trim();

/**
 * Name validation
 */
const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .trim();

/**
 * Schema for creating a new user (POST /api/admin/users)
 */
export const CreateUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  email: emailSchema,
  name: nameSchema,
  roles: z
    .array(RoleSchema)
    .min(1, 'At least one role is required')
    .max(4, 'Cannot assign more than 4 roles'),
});

/**
 * Schema for updating a user (PATCH /api/admin/users/[id])
 */
export const UpdateUserSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  roles: z
    .array(RoleSchema)
    .min(1, 'At least one role is required')
    .max(4, 'Cannot assign more than 4 roles')
    .optional(),
  status: UserStatusSchema.optional(),
}).strict(); // Reject unknown fields

/**
 * Schema for user list query parameters (GET /api/admin/users)
 */
export const UserListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional(),
  role: RoleSchema.optional(),
  status: UserStatusSchema.optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastSeen']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Schema for MongoDB ObjectId validation
 */
export const ObjectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format');

// Type exports for use in TypeScript
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserListQueryInput = z.infer<typeof UserListQuerySchema>;
