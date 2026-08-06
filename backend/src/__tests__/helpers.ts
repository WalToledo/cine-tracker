import type { Response } from "supertest";
import { AUTH_COOKIE } from "../lib/auth-cookie";

/** La cabecera `set-cookie` entera, con sus atributos, para poder aserirlos. */
export function rawAuthCookie(response: Response): string {
  const header = response.headers["set-cookie"] as unknown as string[] | undefined;
  const cookie = header?.find((value) => value.startsWith(`${AUTH_COOKIE}=`));

  if (!cookie) {
    throw new Error(`Response did not set the ${AUTH_COOKIE} cookie`);
  }

  return cookie;
}

/**
 * La misma cookie lista para `.set("Cookie", ...)`: sólo el `nombre=valor`, porque
 * los atributos (`Path`, `HttpOnly`, ...) viajan del servidor al cliente y no al revés.
 */
export function authCookie(response: Response): string {
  return rawAuthCookie(response).split(";")[0];
}
