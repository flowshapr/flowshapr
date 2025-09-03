import { Router } from "express";
import { flowController } from "./controllers/FlowController";
import { validateBody, validateParams } from "../../shared/middleware/validation";
import { requireAuth } from "../../shared/middleware/auth";
import { requireScope, rateLimitToken } from "../../shared/middleware/scope";
import { tracesController } from "../traces/controllers/TracesController";
import { connectionsController } from "../connections/controllers/ConnectionsController";
import { connectionIdParamsSchema, createConnectionSchema, updateConnectionSchema } from "../connections/validation/schemas";
import { promptsController } from "../prompts/controllers/PromptsController";
import {
  createFlowSchema,
  updateFlowSchema,
  saveFlowDefinitionSchema,
  publishFlowSchema,
  addFlowMemberSchema,
  updateFlowMemberRoleSchema,
  flowIdSchema,
  flowMemberParamsSchema,
  flowListQuerySchema,
  executeFlowSchema
} from "./validation/schemas";

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// GET /flows - List user's flows
router.get(
  "/",
  (req, res) => flowController.getUserFlows(req, res)
);

// POST /flows - Create new flow
router.post(
  "/",
  validateBody(createFlowSchema),
  (req, res) => flowController.createFlow(req, res)
);

// GET /flows/:id - Get flow by ID
router.get(
  "/:id",
  validateParams(flowIdSchema),
  (req, res) => flowController.getFlow(req, res)
);

// PUT /flows/:id - Update flow
router.put(
  "/:id",
  validateParams(flowIdSchema),
  validateBody(updateFlowSchema),
  (req, res) => flowController.updateFlow(req, res)
);

// DELETE /flows/:id - Delete flow
router.delete(
  "/:id",
  validateParams(flowIdSchema),
  (req, res) => flowController.deleteFlow(req, res)
);

// POST /flows/:id/definition - Save flow definition (nodes, edges)
router.post(
  "/:id/definition",
  validateParams(flowIdSchema),
  validateBody(saveFlowDefinitionSchema),
  (req, res) => flowController.saveFlowDefinition(req, res)
);

// POST /flows/:id/publish - Publish flow
router.post(
  "/:id/publish",
  validateParams(flowIdSchema),
  validateBody(publishFlowSchema),
  (req, res) => flowController.publishFlow(req, res)
);

// POST /flows/:id/members - Add flow member
router.post(
  "/:id/members",
  validateParams(flowIdSchema),
  validateBody(addFlowMemberSchema),
  (req, res) => flowController.addFlowMember(req, res)
);

// PUT /flows/:id/members/:memberId - Update flow member role
router.put(
  "/:id/members/:memberId",
  validateParams(flowMemberParamsSchema),
  validateBody(updateFlowMemberRoleSchema),
  (req, res) => flowController.updateFlowMemberRole(req, res)
);

// DELETE /flows/:id/members/:memberId - Remove flow member
router.delete(
  "/:id/members/:memberId",
  validateParams(flowMemberParamsSchema),
  (req, res) => flowController.removeFlowMember(req, res)
);

// POST /flows/:id/execute - Execute flow
router.post(
  "/:id/execute",
  validateParams(flowIdSchema),
  validateBody(executeFlowSchema),
  rateLimitToken(),
  requireScope('execute_flow'),
  (req, res) => flowController.executeFlow(req, res)
);

// GET /flows/:id/traces - List traces for a flow
router.get(
  "/:id/traces",
  validateParams(flowIdSchema),
  (req, res) => tracesController.listByFlow(req, res)
);

// GET /flows/:id/traces/:executionId - Get a trace
router.get(
  "/:id/traces/:executionId",
  (req, res) => tracesController.getByExecutionId(req, res)
);

// Prompts (flow-scoped)
router.get(
  "/:id/prompts",
  validateParams(flowIdSchema),
  (req, res) => promptsController.listByFlow(req, res)
);

router.post(
  "/:id/prompts",
  validateParams(flowIdSchema),
  (req, res) => promptsController.createForFlow(req, res)
);

router.put(
  "/:id/prompts/:promptId",
  (req, res) => promptsController.updateForFlow(req, res)
);

router.delete(
  "/:id/prompts/:promptId",
  (req, res) => promptsController.deleteForFlow(req, res)
);

router.get(
  "/:id/prompts/:promptId/export",
  (req, res) => promptsController.exportForFlow(req, res)
);

// Connections (flow-scoped)
router.get(
  "/:id/connections",
  validateParams(flowIdSchema),
  (req, res) => connectionsController.listByFlow(req, res)
);

router.post(
  "/:id/connections",
  validateParams(flowIdSchema),
  validateBody(createConnectionSchema),
  (req, res) => connectionsController.createForFlow(req, res)
);

router.put(
  "/:id/connections/:connectionId",
  validateParams(connectionIdParamsSchema),
  validateBody(updateConnectionSchema),
  (req, res) => connectionsController.updateForFlow(req, res)
);

router.delete(
  "/:id/connections/:connectionId",
  validateParams(connectionIdParamsSchema),
  (req, res) => connectionsController.deleteForFlow(req, res)
);

export { router as flowRoutes };
