import { Router } from "express";
import { getMovie, getTrending, searchMovies } from "../controllers/movies.controller";
import { validateQuery } from "../middlewares/validate.middleware";
import { searchQuerySchema } from "../schemas/movies.schema";

const router = Router();

// El catálogo es público: la API Key de TMDB vive sólo aquí, nunca en el
// navegador. `/trending` y `/search` van antes que `/:id` para que no los
// capture el param.
router.get("/trending", getTrending);
router.get("/search", validateQuery(searchQuerySchema), searchMovies);
router.get("/:id", getMovie);

export default router;
