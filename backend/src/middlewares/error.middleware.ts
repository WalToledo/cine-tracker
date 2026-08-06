import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { firstIssueMessage } from "./validate.middleware";

/**
 * Cierra la API con el mismo contrato `{ error }` que usan los controladores.
 * Sin esto, un throw sin capturar sale por el handler por defecto de Express como
 * HTML con el stack dentro, y el `apiFetch` del frontend no encuentra el campo
 * `error` que espera para construir su `ApiError`.
 *
 * Express 5 sólo reconoce un handler de errores por la aridad de 4, así que
 * `_next` tiene que quedarse aunque no se use.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Si algo ya empezó a escribir la respuesta, Express tiene que abortarla él.
  if (res.headersSent) {
    return _next(err);
  }

  // Red de seguridad: la validación usa `safeParse` en su middleware y no debería
  // llegar nada aquí, pero un `parse()` futuro dentro de un controlador saldría
  // como 500 en vez de como el 400 que corresponde.
  if (err instanceof ZodError) {
    return res.status(400).json({ error: firstIssueMessage(err) });
  }

  // `express.json()` marca así los cuerpos que no son JSON válido. Es culpa del
  // cliente, no del servidor.
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "invalid json body" });
  }

  console.error(err);

  // El stack sólo viaja fuera de producción: en producción es superficie de ataque.
  const body: { error: string; stack?: string } = { error: "Internal server error" };

  if (process.env.NODE_ENV !== "production" && err instanceof Error) {
    body.error = err.message;
    body.stack = err.stack;
  }

  res.status(500).json(body);
}

/**
 * Una ruta inexistente también responde JSON, no el HTML de "Cannot GET /x".
 */
export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}
