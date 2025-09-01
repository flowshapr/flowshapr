import { Router } from "express";
import { authController } from "./controllers/AuthController";
import { validate } from "../../shared/middleware/validation";
import { signUpSchema, signInSchema } from "./validation/schemas";

const router = Router();

// Authentication routes with validation middleware
router.post("/sign-up/email", validate(signUpSchema), (req, res) => authController.signUp(req, res));
router.post("/sign-in/email", validate(signInSchema), (req, res) => authController.signIn(req, res));
router.post("/sign-out", (req, res) => authController.signOut(req, res));
router.get("/session", (req, res) => authController.getSession(req, res));

export { router as authRoutes };