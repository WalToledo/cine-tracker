import { Router } from "express";
import { login, register } from "../controllers/auth.controller";
import { validateBody } from "../middlewares/validate.middleware";
import { loginSchema, registerSchema } from "../schemas/auth.schema";

const router = Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);

export default router;
