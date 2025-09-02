import { eq, and } from "drizzle-orm";
import { db } from "../../../infrastructure/database/connection";
import { team, teamMember, organization, user } from "../../../infrastructure/database/schema/index";
import { generateId } from "../../../shared/utils/crypto";
import { ConflictError, NotFoundError, ForbiddenError } from "../../../shared/utils/errors";
import type { Team, TeamMember, TeamMemberRole } from "../../../shared/types/index";

export class TeamService {
  async createTeam(data: {
    name: string;
    description?: string;
    organizationId: string;
    createdBy: string;
  }): Promise<Team> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Check if user has admin role in the organization
    await this.checkOrganizationAdminAccess(data.organizationId, data.createdBy);

    // Check if team name already exists in the organization
    const existingTeam = await db
      .select()
      .from(team)
      .where(
        and(
          eq(team.name, data.name),
          eq(team.organizationId, data.organizationId)
        )
      )
      .limit(1);

    if (existingTeam.length > 0) {
      throw new ConflictError("Team with this name already exists in the organization");
    }

    const teamId = generateId();
    const newTeam = {
      id: teamId,
      name: data.name,
      description: data.description,
      organizationId: data.organizationId,
    };

    await db.insert(team).values(newTeam);

    return {
      ...newTeam,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getTeamById(id: string): Promise<Team | null> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    const result = await db
      .select()
      .from(team)
      .where(eq(team.id, id))
      .limit(1);

    return result[0] || null;
  }

  async getOrganizationTeams(organizationId: string): Promise<Team[]> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    return await db
      .select()
      .from(team)
      .where(eq(team.organizationId, organizationId));
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    return await db
      .select({
        id: team.id,
        name: team.name,
        description: team.description,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        organizationId: team.organizationId,
      })
      .from(team)
      .innerJoin(teamMember, eq(teamMember.teamId, team.id))
      .where(eq(teamMember.userId, userId));
  }

  async updateTeam(
    id: string,
    data: Partial<Pick<Team, "name" | "description">>,
    userId: string
  ): Promise<Team> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    const existingTeam = await this.getTeamById(id);
    if (!existingTeam) {
      throw new NotFoundError("Team not found");
    }

    // Check if user has admin access
    await this.checkTeamAdminAccess(id, userId);

    await db
      .update(team)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(team.id, id));

    return { ...existingTeam, ...data, updatedAt: new Date() };
  }

  async deleteTeam(id: string, userId: string): Promise<void> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    const existingTeam = await this.getTeamById(id);
    if (!existingTeam) {
      throw new NotFoundError("Team not found");
    }

    // Check if user has admin access
    await this.checkOrganizationAdminAccess(existingTeam.organizationId, userId);

    await db.delete(team).where(eq(team.id, id));
  }

  async addTeamMember(
    teamId: string,
    userId: string,
    role: TeamMemberRole,
    addedBy: string
  ): Promise<TeamMember> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    const existingTeam = await this.getTeamById(teamId);
    if (!existingTeam) {
      throw new NotFoundError("Team not found");
    }

    // Check if adding user has admin access
    await this.checkTeamAdminAccess(teamId, addedBy);

    // Check if user is already a member
    const existingMember = await db
      .select()
      .from(teamMember)
      .where(
        and(
          eq(teamMember.teamId, teamId),
          eq(teamMember.userId, userId)
        )
      )
      .limit(1);

    if (existingMember.length > 0) {
      throw new ConflictError("User is already a team member");
    }

    const memberId = generateId();
    const newMember = {
      id: memberId,
      role,
      teamId,
      userId,
    };

    await db.insert(teamMember).values(newMember);

    return {
      ...newMember,
      joinedAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async removeTeamMember(teamId: string, userId: string, removedBy: string): Promise<void> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Check if removing user has admin access
    await this.checkTeamAdminAccess(teamId, removedBy);

    const member = await db
      .select()
      .from(teamMember)
      .where(
        and(
          eq(teamMember.teamId, teamId),
          eq(teamMember.userId, userId)
        )
      )
      .limit(1);

    if (member.length === 0) {
      throw new NotFoundError("Team member not found");
    }

    await db
      .delete(teamMember)
      .where(
        and(
          eq(teamMember.teamId, teamId),
          eq(teamMember.userId, userId)
        )
      );
  }

  async updateTeamMemberRole(
    teamId: string,
    userId: string,
    role: TeamMemberRole,
    updatedBy: string
  ): Promise<TeamMember> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Check if updating user has admin access
    await this.checkTeamAdminAccess(teamId, updatedBy);

    const member = await db
      .select()
      .from(teamMember)
      .where(
        and(
          eq(teamMember.teamId, teamId),
          eq(teamMember.userId, userId)
        )
      )
      .limit(1);

    if (member.length === 0) {
      throw new NotFoundError("Team member not found");
    }

    await db
      .update(teamMember)
      .set({ role, updatedAt: new Date() })
      .where(
        and(
          eq(teamMember.teamId, teamId),
          eq(teamMember.userId, userId)
        )
      );

    return {
      ...member[0],
      role,
      updatedAt: new Date(),
    };
  }

  async getTeamMembers(teamId: string): Promise<Array<TeamMember & { user: { id: string; name: string; email: string; image?: string | null } }>> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    return await db
      .select({
        id: teamMember.id,
        role: teamMember.role,
        joinedAt: teamMember.joinedAt,
        updatedAt: teamMember.updatedAt,
        teamId: teamMember.teamId,
        userId: teamMember.userId,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      })
      .from(teamMember)
      .innerJoin(user, eq(user.id, teamMember.userId))
      .where(eq(teamMember.teamId, teamId));
  }

  private async checkTeamAdminAccess(teamId: string, userId: string): Promise<void> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    const member = await db
      .select()
      .from(teamMember)
      .where(
        and(
          eq(teamMember.teamId, teamId),
          eq(teamMember.userId, userId),
          eq(teamMember.role, "admin")
        )
      )
      .limit(1);

    if (member.length === 0) {
      // Check if user is organization owner
      const teamData = await db
        .select({ organizationId: team.organizationId })
        .from(team)
        .where(eq(team.id, teamId))
        .limit(1);

      if (teamData.length === 0) {
        throw new NotFoundError("Team not found");
      }

      const orgOwner = await db
        .select()
        .from(organization)
        .where(
          and(
            eq(organization.id, teamData[0].organizationId),
            eq(organization.ownerId, userId)
          )
        )
        .limit(1);

      if (orgOwner.length === 0) {
        throw new ForbiddenError("Admin access required");
      }
    }
  }

  private async checkOrganizationAdminAccess(organizationId: string, userId: string): Promise<void> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Check if user is organization owner
    const orgOwner = await db
      .select()
      .from(organization)
      .where(
        and(
          eq(organization.id, organizationId),
          eq(organization.ownerId, userId)
        )
      )
      .limit(1);

    if (orgOwner.length > 0) {
      return;
    }

    // Check if user has admin role in any team of the organization
    const adminMember = await db
      .select()
      .from(teamMember)
      .innerJoin(team, eq(team.id, teamMember.teamId))
      .where(
        and(
          eq(team.organizationId, organizationId),
          eq(teamMember.userId, userId),
          eq(teamMember.role, "admin")
        )
      )
      .limit(1);

    if (adminMember.length === 0) {
      throw new ForbiddenError("Organization admin access required");
    }
  }
}