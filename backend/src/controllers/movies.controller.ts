import type { Request, Response } from "express";
import {
  MAX_SEARCH_PAGE,
  TmdbNotFoundError,
  getMovieDetails,
  getTrendingMovies,
  searchMovies as searchTmdbMovies,
} from "../services/tmdb.service";

/**
 * `page` es opcional y por defecto la primera. Devuelve `null` (y no una
 * excepción) para que el handler responda 400 con una guard clause, como en
 * `review.controller.ts`.
 */
function parsePage(value: unknown): number | null {
  if (value === undefined) {
    return 1;
  }

  if (typeof value !== "string") {
    return null;
  }

  const page = Number(value);
  if (!Number.isInteger(page) || page < 1 || page > MAX_SEARCH_PAGE) {
    return null;
  }

  return page;
}

export async function getTrending(_req: Request, res: Response) {
  const movies = await getTrendingMovies();

  return res.status(200).json({ movies });
}

export async function searchMovies(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (q === "") {
    return res.status(400).json({ error: "q is required" });
  }

  const page = parsePage(req.query.page);
  if (page === null) {
    return res
      .status(400)
      .json({ error: `page must be an integer between 1 and ${MAX_SEARCH_PAGE}` });
  }

  const result = await searchTmdbMovies(q, page);

  return res.status(200).json(result);
}

export async function getMovie(req: Request<{ id: string }>, res: Response) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "id must be an integer" });
  }

  try {
    const movie = await getMovieDetails(id);
    return res.status(200).json({ movie });
  } catch (error) {
    if (error instanceof TmdbNotFoundError) {
      return res.status(404).json({ error: "movie not found" });
    }
    throw error;
  }
}
