import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/user.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

// El perfil siempre es el del portador del token, así que no hay nada público.
router.use(requireAuth);

router.get("/profile", getProfile);
router.patch("/profile", updateProfile);

export default router;
