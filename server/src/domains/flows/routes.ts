import { Router } from "express";
import { flowController } from "./controllers/FlowController";
import { validateBody, validateParams } from "../../shared/middleware/validation";
import { requireAuth } from "../../shared/middleware/auth";
import { requireScope, rateLimitToken } from "../../shared/middleware/scope";
import { eq } from 'drizzle-orm';
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
  async (req, res) => {
    try {
      const { db } = await import("../../infrastructure/database/connection");
      const schema = await import("../../infrastructure/database/schema");
      const flowId = (req.params as any).id;
      const rows = await (db as any).select({
        id: (schema as any).trace.id,
        executionId: (schema as any).trace.executionId,
        status: (schema as any).trace.status,
        duration: (schema as any).trace.duration,
        createdAt: (schema as any).trace.createdAt,
      }).from((schema as any).trace).where(eq((schema as any).trace.flowId, flowId)).orderBy((schema as any).trace.createdAt);
      res.json({ success: true, data: rows });
    } catch (e) {
      res.status(500).json({ success: false, error: { message: 'Failed to list traces' } });
    }
  }
);

// GET /flows/:id/traces/:executionId - Get a trace
router.get(
  "/:id/traces/:executionId",
  async (req, res) => {
    try {
      const { db } = await import("../../infrastructure/database/connection");
      const schema = await import("../../infrastructure/database/schema");
      const execId = (req.params as any).executionId;
      const rows = await (db as any).select().from((schema as any).trace).where(eq((schema as any).trace.executionId, execId)).limit(1);
      if (!rows || rows.length === 0) return res.status(404).json({ success: false, error: { message: 'Trace not found' } });
      res.json({ success: true, data: rows[0] });
    } catch (e) {
      res.status(500).json({ success: false, error: { message: 'Failed to get trace' } });
    }
  }
);

export { router as flowRoutes };
