import { Router } from "express";
import {
  createReview,
  deleteReview,
  listByMovie,
  updateReview,
} from "../controllers/review.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

// A diferencia de la watchlist, el listado es público: sólo las mutaciones
// pasan por requireAuth.
router.get("/movie/:movieId", listByMovie);
router.post("/", requireAuth, createReview);
router.patch("/:id", requireAuth, updateReview);
router.delete("/:id", requireAuth, deleteReview);

export default router;
