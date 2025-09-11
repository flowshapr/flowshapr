import { eq } from 'drizzle-orm';
import { db } from '../../../infrastructure/database/connection';
import { user } from '../../../infrastructure/database/schema/auth';
import { requireUserAbility } from '../../../shared/authorization/service-guard';

export interface UpdateUserProfileData {
  name?: string;
  email?: string;
  image?: string;
}

export class UserService {
  async updateProfile(userId: string, updates: UpdateUserProfileData): Promise<any> {
    // Authorization check - users can only update their own profile
    await requireUserAbility(userId, 'update', 'User', userId);

    // Validate that at least one field is provided
    if (!updates.name && !updates.email && updates.image === undefined) {
      throw new Error('At least one field must be provided for update');
    }

    // Check if email is already taken (if email is being updated)
    if (updates.email) {
      if (!db) {
        throw new Error('Database connection not available');
      }
      const existingUsers = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, updates.email))
        .limit(1);

      if (existingUsers.length > 0 && existingUsers[0].id !== userId) {
        throw new Error('Email address is already in use');
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.image !== undefined) updateData.image = updates.image || null;

    // Update user profile
    if (!db) {
      throw new Error('Database connection not available');
    }
    const updatedUsers = await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, userId))
      .returning();

    if (updatedUsers.length === 0) {
      throw new Error('User not found');
    }

    // Return updated user data (excluding sensitive fields)
    const updatedUser = updatedUsers[0];
    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      image: updatedUser.image,
      emailVerified: updatedUser.emailVerified,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async getProfile(requestingUserId: string, targetUserId: string): Promise<any> {
    // Authorization check - users can view their own profile, or if they have permission
    await requireUserAbility(requestingUserId, 'read', 'User', targetUserId);

    if (!db) {
      throw new Error('Database connection not available');
    }
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, targetUserId))
      .limit(1);

    if (users.length === 0) {
      throw new Error('User not found');
    }

    return users[0];
  }
}

export const userService = new UserService();