import { eq, and } from "drizzle-orm";
import { db } from "../../../infrastructure/database/connection";
import { organization, team, teamMember } from "../../../infrastructure/database/schema/index";
import { generateId, generateSlug } from "../../../shared/utils/crypto";
import { ConflictError, NotFoundError, ForbiddenError } from "../../../shared/utils/errors";
import type { Organization, Team, TeamMember, TeamMemberRole } from "../../../shared/types/index";

export class OrganizationService {
  async createOrganization(data: {
    name: string;
    slug: string;
    description?: string;
    ownerId: string;
  }): Promise<Organization> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    const slug = data.slug || generateSlug(data.name);
    
    // Check if slug already exists
    const existingOrg = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);
    
    if (existingOrg.length > 0) {
      throw new ConflictError("Organization with this slug already exists");
    }

    const orgId = generateId();
    const newOrg = {
      id: orgId,
      name: data.name,
      slug,
      description: data.description,
      ownerId: data.ownerId,
    };

    await db.insert(organization).values(newOrg);

    // Create default team for the organization
    const defaultTeamId = generateId();
    await db.insert(team).values({
      id: defaultTeamId,
      name: "Default Team",
      description: "Default team for the organization",
      organizationId: orgId,
    });

    // Add owner as admin to the default team
    await db.insert(teamMember).values({
      id: generateId(),
      role: "admin",
      teamId: defaultTeamId,
      userId: data.ownerId,
    });

    return {
      ...newOrg,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    const result = await db
      .select()
      .from(organization)
      .where(eq(organization.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    const result = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);
    
    return result[0] || null;
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Get organizations where user is owner
    const ownedOrgs = await db
      .select()
      .from(organization)
      .where(eq(organization.ownerId, userId));

    // Get organizations where user is a team member
    const memberOrgs = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        description: organization.description,
        logoUrl: organization.logoUrl,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
        ownerId: organization.ownerId,
      })
      .from(organization)
      .innerJoin(team, eq(team.organizationId, organization.id))
      .innerJoin(teamMember, eq(teamMember.teamId, team.id))
      .where(eq(teamMember.userId, userId));

    // Combine and deduplicate
    const orgMap = new Map();
    [...ownedOrgs, ...memberOrgs].forEach(org => {
      orgMap.set(org.id, org);
    });

    return Array.from(orgMap.values());
  }

  /**
   * Ensures a user has at least one organization, creating a default one if needed
   * Returns the organizationId to use for operations
   */
  async ensureUserHasOrganization(userId: string): Promise<string> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Check if user already has any organization
    const existingOrgs = await this.getUserOrganizations(userId);

    if (existingOrgs.length > 0) {
      // Return the first organization ID
      return existingOrgs[0].id;
    }

    // Get user info to create personalized organization
    const { user } = await import("../../../infrastructure/database/schema/index.js");
    const userResult = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const userName = userResult[0]?.name || "User";

    // Create default organization
    const newOrg = await this.createOrganization({
      name: `${userName}'s Organization`,
      slug: generateSlug(`${userName}-org`),
      description: `Default organization for ${userName}`,
      ownerId: userId,
    });

    return newOrg.id;
  }

  async updateOrganization(
    id: string,
    data: Partial<Pick<Organization, "name" | "description" | "logoUrl">>,
    userId: string
  ): Promise<Organization> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    const org = await this.getOrganizationById(id);
    if (!org) {
      throw new NotFoundError("Organization not found");
    }

    if (org.ownerId !== userId) {
      throw new ForbiddenError("Only organization owner can update organization");
    }

    await db
      .update(organization)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organization.id, id));

    return { ...org, ...data, updatedAt: new Date() };
  }

  async deleteOrganization(id: string, userId: string): Promise<void> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    const org = await this.getOrganizationById(id);
    if (!org) {
      throw new NotFoundError("Organization not found");
    }

    if (org.ownerId !== userId) {
      throw new ForbiddenError("Only organization owner can delete organization");
    }

    await db.delete(organization).where(eq(organization.id, id));
  }

  async transferOwnership(organizationId: string, newOwnerId: string, currentOwnerId: string): Promise<void> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    const org = await this.getOrganizationById(organizationId);
    if (!org) {
      throw new NotFoundError("Organization not found");
    }

    if (org.ownerId !== currentOwnerId) {
      throw new ForbiddenError("Only current owner can transfer ownership");
    }

    // Check if new owner is a member of the organization
    const memberCheck = await db
      .select()
      .from(teamMember)
      .innerJoin(team, eq(team.id, teamMember.teamId))
      .where(
        and(
          eq(team.organizationId, organizationId),
          eq(teamMember.userId, newOwnerId)
        )
      )
      .limit(1);

    if (memberCheck.length === 0) {
      throw new ForbiddenError("New owner must be a member of the organization");
    }

    await db
      .update(organization)
      .set({ ownerId: newOwnerId, updatedAt: new Date() })
      .where(eq(organization.id, organizationId));
  }
}