import type { Request, Response } from "express";
import {
  TmdbNotFoundError,
  getMovieDetails,
  getTrendingMovies,
} from "../services/tmdb.service";

export async function getTrending(_req: Request, res: Response) {
  const movies = await getTrendingMovies();

  return res.status(200).json({ movies });
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
