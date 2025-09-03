import { Router } from "express";
import { projectController } from "./controllers/ProjectController";
import { validate } from "../../shared/middleware/validation";
import { requireAuth } from "../../shared/middleware/auth";
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
  updateProjectMemberRoleSchema,
  projectIdSchema,
  projectMemberParamsSchema,
  projectListQuerySchema,
  createApiKeySchema,
  apiKeyIdParamsSchema,
  createPromptSchema,
  updatePromptSchema,
  promptIdParamsSchema,
} from "./validation/schemas";

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// GET /projects - List user's projects
router.get(
  "/",
  validate(projectListQuerySchema),
  (req, res) => projectController.getUserProjects(req, res)
);

// POST /projects - Create new project
router.post(
  "/",
  validate(createProjectSchema),
  (req, res) => projectController.createProject(req, res)
);

// GET /projects/:id - Get project by ID
router.get(
  "/:id",
  validate(projectIdSchema),
  (req, res) => projectController.getProject(req, res)
);

// PUT /projects/:id - Update project
router.put(
  "/:id",
  validate(projectIdSchema),
  validate(updateProjectSchema),
  (req, res) => projectController.updateProject(req, res)
);

// DELETE /projects/:id - Delete project
router.delete(
  "/:id",
  validate(projectIdSchema),
  (req, res) => projectController.deleteProject(req, res)
);

// POST /projects/:id/members - Add project member
router.post(
  "/:id/members",
  validate(projectIdSchema),
  validate(addProjectMemberSchema),
  (req, res) => projectController.addProjectMember(req, res)
);

// PUT /projects/:id/members/:memberId - Update project member role
router.put(
  "/:id/members/:memberId",
  validate(projectMemberParamsSchema),
  validate(updateProjectMemberRoleSchema),
  (req, res) => projectController.updateProjectMemberRole(req, res)
);

// DELETE /projects/:id/members/:memberId - Remove project member
router.delete(
  "/:id/members/:memberId",
  validate(projectMemberParamsSchema),
  (req, res) => projectController.removeProjectMember(req, res)
);

export { router as projectRoutes };

// Access Tokens (API Keys)
router.get(
  "/:id/api-keys",
  validate(projectIdSchema),
  (req, res) => projectController.listApiKeys(req, res)
);

router.post(
  "/:id/api-keys",
  validate(createApiKeySchema),
  (req, res) => projectController.createApiKey(req, res)
);

router.delete(
  "/:id/api-keys/:keyId",
  validate(apiKeyIdParamsSchema),
  (req, res) => projectController.revokeApiKey(req, res)
);

// Prompts
router.get(
  "/:id/prompts",
  validate(projectIdSchema),
  (req, res) => projectController.listPrompts(req, res)
);

router.post(
  "/:id/prompts",
  validate(createPromptSchema),
  (req, res) => projectController.createPrompt(req, res)
);

router.put(
  "/:id/prompts/:promptId",
  validate(updatePromptSchema),
  (req, res) => projectController.updatePrompt(req, res)
);

router.delete(
  "/:id/prompts/:promptId",
  validate(promptIdParamsSchema),
  (req, res) => projectController.deletePrompt(req, res)
);

router.get(
  "/:id/prompts/:promptId/export",
  validate(promptIdParamsSchema),
  (req, res) => projectController.exportPromptDotprompt(req, res)
);
