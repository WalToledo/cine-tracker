import { Router } from "express";
import {
  createReview,
  deleteReview,
  listByMovie,
  updateReview,
} from "../controllers/review.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { createReviewSchema, updateReviewSchema } from "../schemas/review.schema";

const router = Router();

// A diferencia de la watchlist, el listado es público: sólo las mutaciones
// pasan por requireAuth, que va antes de validar para que una petición sin token
// reciba un 401 y no el 400 del schema.
router.get("/movie/:movieId", listByMovie);
router.post("/", requireAuth, validateBody(createReviewSchema), createReview);
router.patch("/:id", requireAuth, validateBody(updateReviewSchema), updateReview);
router.delete("/:id", requireAuth, deleteReview);

export default router;
