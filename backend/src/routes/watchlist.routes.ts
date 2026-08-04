import { Router } from "express";
import {
  addMovie,
  getWatchlist,
  removeMovie,
  updateStatus,
} from "../controllers/watchlist.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", getWatchlist);
router.post("/", addMovie);
router.patch("/:id", updateStatus);
router.delete("/:id", removeMovie);

export default router;
