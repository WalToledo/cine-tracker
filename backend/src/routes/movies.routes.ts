import { Router } from "express";
import { getMovie, getTrending } from "../controllers/movies.controller";

const router = Router();

// El catálogo es público: la API Key de TMDB vive sólo aquí, nunca en el
// navegador. `/trending` va antes que `/:id` para que no lo capture el param.
router.get("/trending", getTrending);
router.get("/:id", getMovie);

export default router;
