import { z } from "zod";

// Team member role enum
export const TeamMemberRole = {
  ADMIN: "admin",
  DEVELOPER: "developer",
} as const;

export type TeamMemberRole = typeof TeamMemberRole[keyof typeof TeamMemberRole];

// Organization types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
}

export interface TeamMember {
  id: string;
  role: TeamMemberRole;
  joinedAt: Date;
  updatedAt: Date;
  teamId: string;
  userId: string;
}

export interface OrganizationInvitation {
  id: string;
  email: string;
  role: TeamMemberRole;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  organizationId: string;
  invitedById: string;
  teamId?: string;
}

// Validation schemas
export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-zA-Z0-9-]+$/),
  description: z.string().max(500).optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  organizationId: z.string().uuid(),
});

export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "developer"]),
  teamId: z.string().uuid().optional(),
});

export const updateTeamMemberRoleSchema = z.object({
  role: z.enum(["admin", "developer"]),
});

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request context
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  emailVerified: boolean;
}

export interface RequestContext {
  user: AuthenticatedUser;
  organizationId?: string;
  teamId?: string;
}