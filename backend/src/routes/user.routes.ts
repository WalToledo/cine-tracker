import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/user.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { updateProfileSchema } from "../schemas/user.schema";

const router = Router();

// El perfil siempre es el del portador del token, así que no hay nada público.
// `requireAuth` va antes de validar: sin token la respuesta debe ser 401, no 400.
router.use(requireAuth);

router.get("/profile", getProfile);
router.patch("/profile", validateBody(updateProfileSchema), updateProfile);

export default router;
