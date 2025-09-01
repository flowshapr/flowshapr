import { Router, Response } from "express";
import { z } from "zod";
import { OrganizationService } from "./services/OrganizationService";
import { requireAuth } from "../../shared/middleware/auth";
import { validateBody, validateParams } from "../../shared/middleware/validation";
import { createOrganizationSchema } from "../../shared/types/index";
import type { ApiResponse } from "../../shared/types/index";

const router = Router();
const organizationService = new OrganizationService();

// Validation schemas
const orgIdSchema = z.object({
  id: z.string().uuid(),
});

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
});

// GET /organizations - Get user's organizations
router.get("/", requireAuth, async (req, res: Response<ApiResponse>, next) => {
  try {
    const organizations = await organizationService.getUserOrganizations(req.user!.id);
    
    res.json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    next(error);
  }
});

// POST /organizations - Create new organization
router.post(
  "/",
  requireAuth,
  validateBody(createOrganizationSchema),
  async (req, res: Response<ApiResponse>, next) => {
    try {
      const organization = await organizationService.createOrganization({
        ...req.body,
        ownerId: req.user!.id,
      });

      res.status(201).json({
        success: true,
        data: organization,
        message: "Organization created successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /organizations/:id - Get organization by ID
router.get(
  "/:id",
  requireAuth,
  validateParams(orgIdSchema),
  async (req, res: Response<ApiResponse>, next) => {
    try {
      const organization = await organizationService.getOrganizationById(req.params.id);

      if (!organization) {
        return res.status(404).json({
          success: false,
          error: "Organization not found",
        });
      }

      res.json({
        success: true,
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /organizations/:id - Update organization
router.put(
  "/:id",
  requireAuth,
  validateParams(orgIdSchema),
  validateBody(updateOrganizationSchema),
  async (req, res: Response<ApiResponse>, next) => {
    try {
      const organization = await organizationService.updateOrganization(
        req.params.id,
        req.body,
        req.user!.id
      );

      res.json({
        success: true,
        data: organization,
        message: "Organization updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /organizations/:id - Delete organization
router.delete(
  "/:id",
  requireAuth,
  validateParams(orgIdSchema),
  async (req, res: Response<ApiResponse>, next) => {
    try {
      await organizationService.deleteOrganization(req.params.id, req.user!.id);

      res.json({
        success: true,
        message: "Organization deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /organizations/:id/transfer - Transfer organization ownership
router.post(
  "/:id/transfer",
  requireAuth,
  validateParams(orgIdSchema),
  validateBody(z.object({ newOwnerId: z.string().uuid() })),
  async (req, res: Response<ApiResponse>, next) => {
    try {
      await organizationService.transferOwnership(
        req.params.id,
        req.body.newOwnerId,
        req.user!.id
      );

      res.json({
        success: true,
        message: "Organization ownership transferred successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as organizationRoutes };