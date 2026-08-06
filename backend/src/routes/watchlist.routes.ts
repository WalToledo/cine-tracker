import { Router } from "express";
import {
  addMovie,
  getWatchlist,
  removeMovie,
  updateStatus,
} from "../controllers/watchlist.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { addMovieSchema, updateStatusSchema } from "../schemas/watchlist.schema";

const router = Router();

// Antes de validar: sin token la respuesta debe ser 401, no el 400 del schema.
router.use(requireAuth);

router.get("/", getWatchlist);
router.post("/", validateBody(addMovieSchema), addMovie);
router.patch("/:id", validateBody(updateStatusSchema), updateStatus);
router.delete("/:id", removeMovie);

export default router;
