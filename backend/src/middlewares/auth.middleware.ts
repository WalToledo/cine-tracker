import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AUTH_COOKIE } from "../lib/auth-cookie";

interface AuthTokenPayload {
  sub: string;
  email: string;
}

// El token viaja sólo en la cookie httpOnly: el header `Authorization` ya no se
// mira, para que el JavaScript de la página no pueda tener el token en ningún lado.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE] as string | undefined;

  if (!token) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as AuthTokenPayload;
    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
