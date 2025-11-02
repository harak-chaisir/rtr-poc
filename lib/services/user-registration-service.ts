import { connectToDB } from '@/lib/db';
import { RtrUser } from '@/lib/models/User';
import { registerFastTrakUser } from '@/lib/fasttrak';
import type { IRtrUser, Role } from '@/lib/models/User';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserResponse,
  UserListQuery,
  UserListResponse,
} from '@/types/user-registration';
import { BadGatewayError, InternalServerError, NotFoundError, AppError } from '@/lib/errors';

/**
 * User Registration Service
 * Handles user management operations including creation, updates, and queries
 * Separates business logic from API routes for better testability
 */

/**
 * Registers a new user in both FastTrak and RTR database
 * 
 * @param userData - User creation data
 * @param createdBy - Admin user ID performing the registration
 * @returns Created user data
 * @throws BadGatewayError if FastTrak API fails
 * @throws InternalServerError if database operation fails
 */
export async function registerUser(
  userData: CreateUserRequest,
  createdBy: string
): Promise<UserResponse> {
  try {
    // Step 1: Register user in FastTrak system
    const fastTrakResponse = await registerFastTrakUser(
      userData.username,
      userData.password,
      userData.email,
      userData.name
    );

    // Step 2: Connect to database
    await connectToDB();

    // Step 3: Create user in RTR MongoDB with RTR-managed roles
    const user = await RtrUser.create({
      fasttrakId: fastTrakResponse.id,
      username: userData.username,
      email: userData.email,
      name: userData.name,
      roles: userData.roles,
      status: 'active',
      isActive: true,
      createdBy,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return mapUserToResponse(user);
  } catch (error) {
    // Re-throw if already an AppError
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }

    // Check if it's a FastTrak API error
    if (error instanceof Error && error.message.includes('FastTrak')) {
      throw new BadGatewayError(
        `Failed to register user in FastTrak: ${error.message}`,
        'FastTrak'
      );
    }

    // Database or other errors
    throw new InternalServerError(
      error instanceof Error 
        ? `Failed to register user: ${error.message}`
        : 'Failed to register user: Unknown error'
    );
  }
}

/**
 * Updates user information and roles
 * 
 * @param userId - MongoDB user ID
 * @param updates - Fields to update
 * @param updatedBy - Admin user ID performing the update
 * @returns Updated user data
 * @throws NotFoundError if user not found
 * @throws InternalServerError if update fails
 */
export async function updateUser(
  userId: string,
  updates: UpdateUserRequest,
  updatedBy: string
): Promise<UserResponse> {
  await connectToDB();

  try {
    const user = await RtrUser.findByIdAndUpdate(
      userId,
      {
        ...updates,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new NotFoundError('User not found', 'User');
    }

    // Log the update (we'll implement audit logging separately)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[UserService] User ${userId} updated by ${updatedBy}`, updates);
    }

    return mapUserToResponse(user);
  } catch (error) {
    // Re-throw if already an AppError
    if (error instanceof AppError) {
      throw error;
    }
    throw new InternalServerError(
      error instanceof Error 
        ? `Failed to update user: ${error.message}`
        : 'Failed to update user: Unknown error'
    );
  }
}

/**
 * Updates user roles (RTR-managed, not FastTrak)
 * 
 * @param userId - MongoDB user ID
 * @param roles - New roles to assign
 * @param updatedBy - Admin user ID performing the update
 * @returns Updated user data
 */
export async function updateUserRoles(
  userId: string,
  roles: Role[],
  updatedBy: string
): Promise<UserResponse> {
  return updateUser(userId, { roles }, updatedBy);
}

/**
 * Deactivates a user (sets status to inactive)
 * 
 * @param userId - MongoDB user ID
 * @param deactivatedBy - Admin user ID performing the deactivation
 * @returns Updated user data
 */
export async function deactivateUser(
  userId: string,
  deactivatedBy: string
): Promise<UserResponse> {
  return updateUser(userId, { status: 'inactive' }, deactivatedBy);
}

/**
 * Activates a user (sets status to active)
 * 
 * @param userId - MongoDB user ID
 * @param activatedBy - Admin user ID performing the activation
 * @returns Updated user data
 */
export async function activateUser(
  userId: string,
  activatedBy: string
): Promise<UserResponse> {
  return updateUser(userId, { status: 'active' }, activatedBy);
}

/**
 * Gets a single user by ID
 * 
 * @param userId - MongoDB user ID
 * @returns User data
 * @throws NotFoundError if user not found
 */
export async function getUserById(userId: string): Promise<UserResponse> {
  await connectToDB();

  const user = await RtrUser.findById(userId);

  if (!user) {
    throw new NotFoundError('User not found', 'User');
  }

  return mapUserToResponse(user);
}

/**
 * Gets a single user by FastTrak ID
 * 
 * @param fasttrakId - FastTrak user ID
 * @returns User data
 * @throws NotFoundError if user not found
 */
export async function getUserByFasttrakId(fasttrakId: string): Promise<UserResponse> {
  await connectToDB();

  const user = await RtrUser.findOne({ fasttrakId });

  if (!user) {
    throw new NotFoundError('User not found', 'User');
  }

  return mapUserToResponse(user);
}

/**
 * Lists users with pagination, filtering, and sorting
 * 
 * @param query - Query parameters for filtering and pagination
 * @returns Paginated list of users
 */
export async function listUsers(query: UserListQuery = {}): Promise<UserListResponse> {
  await connectToDB();

  const {
    page = 1,
    limit = 10,
    search,
    role,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  // Build filter query
  const filter: Record<string, unknown> = {};

  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (role) {
    filter.roles = role;
  }

  if (status) {
    filter.status = status;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build sort object
  const sort: Record<string, 1 | -1> = {
    [sortBy]: sortOrder === 'asc' ? 1 : -1,
  };

  // Execute query with pagination
  const [users, total] = await Promise.all([
    RtrUser.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    RtrUser.countDocuments(filter),
  ]);

  return {
    users: users.map(mapUserToResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Checks if a username is already taken
 * 
 * @param username - Username to check
 * @returns True if username exists, false otherwise
 */
export async function isUsernameTaken(username: string): Promise<boolean> {
  await connectToDB();
  const user = await RtrUser.findOne({ username });
  return !!user;
}

/**
 * Maps Mongoose user document to API response format
 * Removes sensitive data and formats dates
 * 
 * @param user - Mongoose user document or lean object
 * @returns Safe user response object
 */
function mapUserToResponse(user: unknown): UserResponse {
  const u = user as IRtrUser & { _id: { toString: () => string } };
  
  return {
    id: u._id.toString(),
    fasttrakId: u.fasttrakId,
    username: u.username,
    email: u.email || '',
    name: u.name || '',
    roles: u.roles as Role[],
    status: u.status as 'active' | 'inactive' | 'suspended',
    isActive: u.isActive,
    createdBy: u.createdBy || '',
    createdAt: u.createdAt || new Date(),
    updatedAt: u.updatedAt || new Date(),
    lastSeen: u.lastSeen,
  };
}
