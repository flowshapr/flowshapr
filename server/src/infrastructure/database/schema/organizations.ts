import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

// Define enums for roles
export const teamMemberRoleEnum = pgEnum("team_member_role", ["admin", "developer"]);

// Organizations table
export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

// Teams table
export const team = pgTable("team", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
});

// Team members junction table
export const teamMember = pgTable("team_member", {
  id: text("id").primaryKey(),
  role: teamMemberRoleEnum("role").notNull().default("developer"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

// Organization invitations
export const organizationInvitation = pgTable("organization_invitation", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  role: teamMemberRoleEnum("role").notNull().default("developer"),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  invitedById: text("invited_by_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
});

// Define relations
export const organizationRelations = relations(organization, ({ one, many }) => ({
  owner: one(user, {
    fields: [organization.ownerId],
    references: [user.id],
  }),
  teams: many(team),
  invitations: many(organizationInvitation),
}));

export const teamRelations = relations(team, ({ one, many }) => ({
  organization: one(organization, {
    fields: [team.organizationId],
    references: [organization.id],
  }),
  members: many(teamMember),
  invitations: many(organizationInvitation),
}));

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, {
    fields: [teamMember.teamId],
    references: [team.id],
  }),
  user: one(user, {
    fields: [teamMember.userId],
    references: [user.id],
  }),
}));

export const organizationInvitationRelations = relations(organizationInvitation, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationInvitation.organizationId],
    references: [organization.id],
  }),
  invitedBy: one(user, {
    fields: [organizationInvitation.invitedById],
    references: [user.id],
  }),
  team: one(team, {
    fields: [organizationInvitation.teamId],
    references: [team.id],
  }),
}));