import type { CookieOptions, Response } from "express";

export const AUTH_COOKIE = "cinetracker_token";

// Una sola constante para el `expiresIn` del JWT y el `maxAge` de la cookie: si
// divergen, el navegador borra la cookie mientras el token sigue vivo (o al revés,
// manda un token caducado en cada petición hasta que el usuario limpia el navegador).
export const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

// `secure` sólo en producción: en desarrollo no hay HTTPS y el navegador
// descartaría la cookie sin decir nada.
const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: TOKEN_TTL_SECONDS * 1000 });
}

// `clearCookie` tiene que recibir las mismas opciones con las que se emitió o el
// navegador no la reconoce como la misma cookie y se queda con la vieja.
export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, COOKIE_OPTIONS);
}
