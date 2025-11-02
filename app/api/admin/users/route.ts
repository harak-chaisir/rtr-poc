import { NextRequest } from 'next/server';
import { requireAdmin, getCurrentUserId, createSuccessResponse } from '@/lib/auth/admin-guard';
import { registerUser, isUsernameTaken, listUsers } from '@/lib/services/user-registration-service';
import { CreateUserSchema, UserListQuerySchema } from '@/lib/validations/user-schemas';
import { withLoggingAndErrorHandling } from '@/lib/logger';
import { ConflictError } from '@/lib/errors';

/**
 * GET /api/admin/users
 * Lists all users with pagination, filtering, and sorting
 * Admin only - requires Admin role
 */
export const GET = withLoggingAndErrorHandling(async (request: NextRequest) => {
  // Step 1: Verify admin authorization
  await requireAdmin();

  // Step 2: Parse and validate query parameters
  const { searchParams } = request.nextUrl;
  const queryParams = {
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    search: searchParams.get('search'),
    role: searchParams.get('role'),
    status: searchParams.get('status'),
    sortBy: searchParams.get('sortBy'),
    sortOrder: searchParams.get('sortOrder'),
  };

  const validatedQuery = UserListQuerySchema.parse(queryParams);

  // Step 3: Fetch users with pagination
  const result = await listUsers(validatedQuery);

  // Step 4: Return success response
  return createSuccessResponse(result);
});

/**
 * POST /api/admin/users
 * Creates a new user in both FastTrak and RTR database
 * Admin only - requires Admin role
 */
export const POST = withLoggingAndErrorHandling(async (request: NextRequest) => {
  // Step 1: Verify admin authorization
  await requireAdmin();
  const adminUserId = await getCurrentUserId();

  // Step 2: Parse and validate request body
  const body = await request.json();
  const validatedData = CreateUserSchema.parse(body);

  // Step 3: Check if username is already taken
  const usernameTaken = await isUsernameTaken(validatedData.username);
  if (usernameTaken) {
    throw new ConflictError('Username is already taken', { username: validatedData.username });
  }

  // Step 4: Register user in FastTrak and MongoDB
  const newUser = await registerUser(validatedData, adminUserId);

  // Step 5: Return success response
  return createSuccessResponse(
    {
      message: 'User created successfully',
      user: newUser,
    },
    201
  );
});
