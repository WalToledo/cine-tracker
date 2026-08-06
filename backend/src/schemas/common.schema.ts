import { z } from "zod";

/** Lo comparten las reseñas y la watchlist: ambas guardan el id de TMDB. */
export const MOVIE_ID_ERROR = "movieId must be an integer";

export const movieIdSchema = z.int(MOVIE_ID_ERROR);
