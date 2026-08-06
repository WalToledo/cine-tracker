import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { publicUserSelect, uniqueConflictError } from "../lib/user";
import type { LoginBody, RegisterBody } from "../schemas/auth.schema";

// El payload se queda en `sub` + `email` a propósito: el username es editable y
// un token de 7 días arrastraría el valor viejo hasta su caducidad.
function signToken(user: { id: string; email: string }) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });
}

// El body ya llega validado y normalizado por `validateBody(registerSchema)`.
export async function register(req: Request<never, unknown, RegisterBody>, res: Response) {
  const { email, password, firstName, lastName, username } = req.body;

  // Dos consultas separadas en vez de un `OR`: así cada conflicto tiene su
  // mensaje. Discriminarlos en JavaScript sería incorrecto porque `===` distingue
  // mayúsculas y el índice único de MySQL no.
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return res.status(409).json({ error: "email already registered" });
  }

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    return res.status(409).json({ error: "username already taken" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  let user;
  try {
    user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName, username },
      select: publicUserSelect,
    });
  } catch (err) {
    // Dos registros simultáneos pueden pasar las comprobaciones de arriba y
    // chocar en el índice; sin esto sería un 500.
    const conflict = uniqueConflictError(err);
    if (conflict) {
      return res.status(409).json({ error: conflict });
    }
    throw err;
  }

  const token = signToken(user);

  return res.status(201).json({ user, token });
}

export async function login(req: Request<never, unknown, LoginBody>, res: Response) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { ...publicUserSelect, password: true },
  });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const { password: _password, ...publicUser } = user;
  const token = signToken(publicUser);
  
  return res.status(200).json({ user: publicUser, token });
}
