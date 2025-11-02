import { NextRequest } from 'next/server';
import { requireAdmin, getCurrentUserId, createSuccessResponse } from '@/lib/auth/admin-guard';
import { updateUser, getUserById } from '@/lib/services/user-registration-service';
import { UpdateUserSchema, ObjectIdSchema } from '@/lib/validations/user-schemas';
import { withLoggingAndErrorHandling } from '@/lib/logger';

/**
 * PATCH /api/admin/users/[id]
 * Updates user information (name, email, roles, status)
 * Admin only - requires Admin role
 */
export const PATCH = withLoggingAndErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Step 1: Verify admin authorization
  await requireAdmin();
  const adminUserId = await getCurrentUserId();

  // Step 2: Validate user ID
  const { id } = await params;
  ObjectIdSchema.parse(id);

  // Step 3: Verify user exists (will throw NotFoundError if not found)
  await getUserById(id);

  // Step 4: Parse and validate request body
  const body = await request.json();
  const validatedData = UpdateUserSchema.parse(body);

  // Step 5: Update user
  const updatedUser = await updateUser(id, validatedData, adminUserId);

  // Step 6: Return success response
  return createSuccessResponse({
    message: 'User updated successfully',
    user: updatedUser,
  });
});

/**
 * GET /api/admin/users/[id]
 * Gets a single user by ID
 * Admin only - requires Admin role
 */
export const GET = withLoggingAndErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Step 1: Verify admin authorization
  await requireAdmin();

  // Step 2: Validate user ID
  const { id } = await params;
  ObjectIdSchema.parse(id);

  // Step 3: Fetch user (will throw NotFoundError if not found)
  const user = await getUserById(id);

  // Step 4: Return success response
  return createSuccessResponse({ user });
});
