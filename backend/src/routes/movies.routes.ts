import { Router } from "express";
import { getMovie, getTrending, searchMovies } from "../controllers/movies.controller";

const router = Router();

// El catálogo es público: la API Key de TMDB vive sólo aquí, nunca en el
// navegador. `/trending` y `/search` van antes que `/:id` para que no los
// capture el param.
router.get("/trending", getTrending);
router.get("/search", searchMovies);
router.get("/:id", getMovie);

export default router;
