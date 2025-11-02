import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';

/**
 * Admin Authorization Guard
 * Utilities for protecting admin-only routes and operations
 */

/**
 * Gets the current session and verifies admin role
 * Throws error if not authenticated or not admin
 * 
 * @returns Session with admin user
 * @throws UnauthorizedError if not authenticated
 * @throws ForbiddenError if not admin
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new UnauthorizedError();
  }

  const userRoles = session.user.roles || [];

  if (!userRoles.includes('Admin')) {
    throw new ForbiddenError('Admin role required');
  }

  return session;
}

/**
 * Checks if current user is admin
 * Returns null if not admin, session if admin
 * 
 * @returns Session if admin, null otherwise
 */
export async function isAdmin() {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

/**
 * Gets current user ID from session
 * Throws error if not authenticated
 * 
 * @returns User ID
 * @throws UnauthorizedError if not authenticated
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new UnauthorizedError();
  }

  return session.user.id;
}

/**
 * Creates a standardized error response for API routes
 * 
 * @param message - Error message
 * @param status - HTTP status code
 * @returns NextResponse with error
 */
export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

/**
 * Creates a standardized success response for API routes
 * 
 * @param data - Response data
 * @param status - HTTP status code
 * @returns NextResponse with data
 */
export function createSuccessResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}
