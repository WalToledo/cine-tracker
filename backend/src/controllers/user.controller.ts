import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { WatchStatus } from "../generated/prisma/enums";
import { publicUserSelect, uniqueConflictError } from "../lib/user";
import type { UpdateProfileBody } from "../schemas/user.schema";

export async function getProfile(req: Request, res: Response) {
  const userId = req.user!.id;

  // Tres `count` en lugar de un `groupBy`: el agrupado sólo devuelve los estados
  // que tienen filas, así que un usuario nuevo obtendría un array vacío y habría
  // que plegarlo a ceros. El coste es el mismo y van en un único viaje.
  const [user, pending, watched, reviews] = await prisma.$transaction([
    prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect }),
    prisma.watchlistItem.count({ where: { userId, status: WatchStatus.PENDING } }),
    prisma.watchlistItem.count({ where: { userId, status: WatchStatus.WATCHED } }),
    prisma.review.count({ where: { userId } }),
  ]);

  // El token puede seguir siendo válido aunque la cuenta ya no exista.
  if (!user) {
    return res.status(404).json({ error: "user not found" });
  }

  return res.status(200).json({ user, stats: { watched, pending, reviews } });
}

export async function updateProfile(req: Request<never, unknown, UpdateProfileBody>, res: Response) {
  const userId = req.user!.id;
  // Zod omite del resultado las claves que no venían, así que el body validado ya
  // es exactamente el `data` del update.
  const data = req.body;

  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!existing) {
    return res.status(404).json({ error: "user not found" });
  }

  if (data.username !== undefined) {
    // La comparación se hace por id, nunca por texto: como la collation ignora
    // las mayúsculas, cambiar sólo la capitalización del username propio casa con
    // la fila de uno mismo y debe permitirse.
    const owner = await prisma.user.findUnique({
      where: { username: data.username },
      select: { id: true },
    });
    if (owner && owner.id !== userId) {
      return res.status(409).json({ error: "username already taken" });
    }
  }

  let user;
  try {
    user = await prisma.user.update({ where: { id: userId }, data, select: publicUserSelect });
  } catch (err) {
    const conflict = uniqueConflictError(err);
    if (conflict) {
      return res.status(409).json({ error: conflict });
    }
    throw err;
  }

  return res.status(200).json({ user });
}
