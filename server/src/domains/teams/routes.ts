import { Router, Response } from "express";
import { z } from "zod";
import { TeamService } from "./services/TeamService";
import { requireAuth } from "../../shared/middleware/auth";
import { validateBody, validateParams } from "../../shared/middleware/validation";
import { createTeamSchema, updateTeamMemberRoleSchema } from "../../shared/types/index";
import type { ApiResponse } from "../../shared/types/index";

const router = Router();
const teamService = new TeamService();

// Validation schemas
const teamIdSchema = z.object({
  id: z.string().uuid(),
});

const userIdSchema = z.object({
  userId: z.string().uuid(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "developer"]),
});

const orgIdQuerySchema = z.object({
  organizationId: z.string().uuid().optional(),
});

// GET /teams - Get user's teams or organization teams
router.get(
  "/",
  requireAuth,
  async (req, res: Response<ApiResponse>, next) => {
    try {
      const { organizationId } = req.query as { organizationId?: string };
      
      let teams;
      if (organizationId) {
        teams = await teamService.getOrganizationTeams(organizationId);
      } else {
        teams = await teamService.getUserTeams(req.user!.id);
      }

      res.json({
        success: true,
        data: teams,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /teams - Create new team
router.post(
  "/",
  requireAuth,
  validateBody(createTeamSchema),
  async (req, res: Response<ApiResponse>, next) => {
    try {
      const team = await teamService.createTeam({
        ...req.body,
        createdBy: req.user!.id,
      });

      res.status(201).json({
        success: true,
        data: team,
        message: "Team created successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /teams/:id - Get team by ID
router.get(
  "/:id",
  requireAuth,
  validateParams(teamIdSchema),
  async (req, res: Response<ApiResponse>, next) => {
    try {
      const team = await teamService.getTeamById(req.params.id);

      if (!team) {
        return res.status(404).json({
          success: false,
          error: "Team not found",
        });
      }

      res.json({
        success: true,
        data: team,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /teams/:id - Update team
router.put(
  "/:id",
  requireAuth,
  validateParams(teamIdSchema),
  validateBody(z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
  })),
  async (req, res: Response<ApiResponse>, next) => {
    try {
      const team = await teamService.updateTeam(req.params.id, req.body, req.user!.id);

      res.json({
        success: true,
        data: team,
        message: "Team updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /teams/:id - Delete team
router.delete(
  "/:id",
  requireAuth,
  validateParams(teamIdSchema),
  async (req, res: Response<ApiResponse>, next) => {
    try {
      await teamService.deleteTeam(req.params.id, req.user!.id);

      res.json({
        success: true,
        message: "Team deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /teams/:id/members - Get team members
router.get(
  "/:id/members",
  requireAuth,
  validateParams(teamIdSchema),
  async (req, res: Response<ApiResponse>, next) => {
    try {
      const members = await teamService.getTeamMembers(req.params.id);

      res.json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /teams/:id/members - Add team member
router.post(
  "/:id/members",
  requireAuth,
  validateParams(teamIdSchema),
  validateBody(addMemberSchema),
  async (req, res: Response<ApiResponse>, next) => {
    try {
      const member = await teamService.addTeamMember(
        req.params.id,
        req.body.userId,
        req.body.role,
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: member,
        message: "Team member added successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /teams/:id/members/:userId - Remove team member
router.delete(
  "/:id/members/:userId",
  requireAuth,
  validateParams(teamIdSchema.merge(userIdSchema)),
  async (req, res: Response<ApiResponse>, next) => {
    try {
      await teamService.removeTeamMember(req.params.id, req.params.userId, req.user!.id);

      res.json({
        success: true,
        message: "Team member removed successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /teams/:id/members/:userId - Update team member role
router.put(
  "/:id/members/:userId",
  requireAuth,
  validateParams(teamIdSchema.merge(userIdSchema)),
  validateBody(updateTeamMemberRoleSchema),
  async (req, res: Response<ApiResponse>, next) => {
    try {
      const member = await teamService.updateTeamMemberRole(
        req.params.id,
        req.params.userId,
        req.body.role,
        req.user!.id
      );

      res.json({
        success: true,
        data: member,
        message: "Team member role updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as teamRoutes };