import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import type { AddMovieBody, UpdateStatusBody } from "../schemas/watchlist.schema";

export async function getWatchlist(req: Request, res: Response) {
  const userId = req.user!.id;

  const items = await prisma.watchlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json({ items });
}

export async function addMovie(req: Request<never, unknown, AddMovieBody>, res: Response) {
  const userId = req.user!.id;
  const { movieId, title, posterPath } = req.body;

  const existing = await prisma.watchlistItem.findUnique({
    where: { userId_movieId: { userId, movieId } },
  });

  if (existing) {
    return res.status(409).json({ error: "movie already in watchlist" });
  }

  const item = await prisma.watchlistItem.create({
    data: { userId, movieId, title, posterPath },
  });

  return res.status(201).json({ item });
}

export async function updateStatus(
  req: Request<{ id: string }, unknown, UpdateStatusBody>,
  res: Response,
) {
  const userId = req.user!.id;
  const { id } = req.params;
  const { status } = req.body;

  const existing = await prisma.watchlistItem.findFirst({ where: { id, userId } });
  if (!existing) {
    return res.status(404).json({ error: "watchlist item not found" });
  }

  const item = await prisma.watchlistItem.update({
    where: { id },
    data: { status },
  });

  return res.status(200).json({ item });
}

export async function removeMovie(req: Request<{ id: string }>, res: Response) {
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = await prisma.watchlistItem.findFirst({ where: { id, userId } });
  if (!existing) {
    return res.status(404).json({ error: "watchlist item not found" });
  }

  await prisma.watchlistItem.delete({ where: { id } });

  return res.status(204).send();
}
