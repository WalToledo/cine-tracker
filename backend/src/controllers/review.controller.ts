import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { MOVIE_ID_ERROR } from "../schemas/common.schema";
import type { CreateReviewBody, UpdateReviewBody } from "../schemas/review.schema";

interface ReviewWithAuthor {
  id: string;
  movieId: number;
  rating: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; username: string };
}

/**
 * Las reseñas son públicas y el autor se identifica por el nombre de usuario que
 * él mismo eligió. El email ni siquiera se lee de la base, así que no puede
 * filtrarse. La clave sigue llamándose `displayName` porque describe el papel del
 * campo —el nombre visible— y es el contrato que ya consume el frontend.
 */
function toPublicReview(review: ReviewWithAuthor) {
  const { user, ...rest } = review;

  return {
    ...rest,
    author: { id: user.id, displayName: user.username },
  };
}

const authorSelect = { select: { id: true, username: true } } as const;

export async function listByMovie(req: Request<{ movieId: string }>, res: Response) {
  const movieId = Number(req.params.movieId);

  // Los params de ruta se siguen validando a mano: `req.params` lo reescribe el
  // router en cada capa y devolvérselo validado sería frágil.
  if (!Number.isInteger(movieId)) {
    return res.status(400).json({ error: MOVIE_ID_ERROR });
  }

  const reviews = await prisma.review.findMany({
    where: { movieId },
    orderBy: { createdAt: "desc" },
    include: { user: authorSelect },
  });

  return res.status(200).json({ reviews: reviews.map(toPublicReview) });
}

export async function createReview(req: Request<never, unknown, CreateReviewBody>, res: Response) {
  const userId = req.user!.id;
  const { movieId, rating, content } = req.body;

  const existing = await prisma.review.findUnique({
    where: { userId_movieId: { userId, movieId } },
  });

  if (existing) {
    return res.status(409).json({ error: "you already reviewed this movie" });
  }

  const review = await prisma.review.create({
    data: { userId, movieId, rating, content },
    include: { user: authorSelect },
  });

  return res.status(201).json({ review: toPublicReview(review) });
}

export async function updateReview(
  req: Request<{ id: string }, unknown, UpdateReviewBody>,
  res: Response,
) {
  const userId = req.user!.id;
  const { id } = req.params;
  const data = req.body;

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
