import type { Request, Response } from "express";
import prisma from "../lib/prisma";

const MIN_RATING = 1;
const MAX_RATING = 5;
const MAX_CONTENT_LENGTH = 2000;

interface ReviewWithAuthor {
  id: string;
  movieId: number;
  rating: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; email: string };
}

/**
 * Las reseñas son públicas, así que el email nunca sale del backend:
 * se expone sólo la parte local como nombre visible del autor.
 */
function toPublicReview(review: ReviewWithAuthor) {
  const { user, ...rest } = review;

  return {
    ...rest,
    author: { id: user.id, displayName: user.email.split("@")[0] },
  };
}

const authorSelect = { select: { id: true, email: true } } as const;

function parseRating(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < MIN_RATING || value > MAX_RATING) return null;
  return value;
}

function parseContent(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > MAX_CONTENT_LENGTH) return null;
  return trimmed;
}

export async function listByMovie(req: Request<{ movieId: string }>, res: Response) {
  const movieId = Number(req.params.movieId);

  if (!Number.isInteger(movieId)) {
    return res.status(400).json({ error: "movieId must be an integer" });
  }

  const reviews = await prisma.review.findMany({
    where: { movieId },
    orderBy: { createdAt: "desc" },
    include: { user: authorSelect },
  });

  return res.status(200).json({ reviews: reviews.map(toPublicReview) });
}

export async function createReview(req: Request, res: Response) {
  const userId = req.user!.id;
  const { movieId, rating, content } = req.body ?? {};

  if (typeof movieId !== "number" || !Number.isInteger(movieId)) {
    return res.status(400).json({ error: "movieId must be an integer" });
  }

  const parsedRating = parseRating(rating);
  if (parsedRating === null) {
    return res.status(400).json({ error: `rating must be an integer between ${MIN_RATING} and ${MAX_RATING}` });
  }

  const parsedContent = parseContent(content);
  if (parsedContent === null) {
    return res
      .status(400)
      .json({ error: `content is required and must be at most ${MAX_CONTENT_LENGTH} characters` });
  }

  const existing = await prisma.review.findUnique({
    where: { userId_movieId: { userId, movieId } },
  });

  if (existing) {
    return res.status(409).json({ error: "you already reviewed this movie" });
  }

  const review = await prisma.review.create({
    data: { userId, movieId, rating: parsedRating, content: parsedContent },
    include: { user: authorSelect },
  });

  return res.status(201).json({ review: toPublicReview(review) });
}

export async function updateReview(req: Request<{ id: string }>, res: Response) {
  const userId = req.user!.id;
  const { id } = req.params;
  const { rating, content } = req.body ?? {};

  if (rating === undefined && content === undefined) {
    return res.status(400).json({ error: "rating or content is required" });
  }

  const data: { rating?: number; content?: string } = {};

  if (rating !== undefined) {
    const parsedRating = parseRating(rating);
    if (parsedRating === null) {
      return res
        .status(400)
        .json({ error: `rating must be an integer between ${MIN_RATING} and ${MAX_RATING}` });
    }
    data.rating = parsedRating;
  }

  if (content !== undefined) {
    const parsedContent = parseContent(content);
    if (parsedContent === null) {
      return res
        .status(400)
        .json({ error: `content is required and must be at most ${MAX_CONTENT_LENGTH} characters` });
    }
    data.content = parsedContent;
  }

  const existing = await prisma.review.findFirst({ where: { id, userId } });
  if (!existing) {
    return res.status(404).json({ error: "review not found" });
  }

  const review = await prisma.review.update({
    where: { id },
    data,
    include: { user: authorSelect },
  });

  return res.status(200).json({ review: toPublicReview(review) });
}

export async function deleteReview(req: Request<{ id: string }>, res: Response) {
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = await prisma.review.findFirst({ where: { id, userId } });
  if (!existing) {
    return res.status(404).json({ error: "review not found" });
  }

  await prisma.review.delete({ where: { id } });

  return res.status(204).send();
}
