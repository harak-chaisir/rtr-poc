import { connectToDB } from "@/lib/db";
import { RtrUser } from "@/lib/models/User";
import type { IRtrUser } from "@/lib/models/User";

/**
 * User service - handles all user-related database operations
 */

export interface UserData {
  id: string;
  fasttrakId: string;
  roles: string[];
  name?: string | null;
  email?: string | null;
}

/**
 * Creates or updates a user in the database
 * Uses upsert pattern for idempotent operations
 * 
 * @param fasttrakId - The user's FastTrak ID
 * @param roles - User roles from FastTrak
 * @returns User data including database ID
 */
export async function upsertUser(
  fasttrakId: string,
  roles: string[]
): Promise<UserData> {
  await connectToDB();

  const userDoc = await RtrUser.findOneAndUpdate(
    { fasttrakId },
    {
      $setOnInsert: { createdAt: new Date() },
      $set: {
        lastSeen: new Date(),
        roles, // Update roles from FastTrak response
      },
    },
    { upsert: true, new: true }
  ).lean();

  if (!userDoc) {
    throw new Error('Failed to create or update user');
  }

  // Type assertion needed due to Mongoose lean() return type
  const user = userDoc as unknown as IRtrUser & { _id: { toString: () => string } };

  return {
    id: user._id.toString(),
    fasttrakId: user.fasttrakId,
    roles: user.roles || [],
    name: user.name || null,
    email: user.email || null,
  };
}
