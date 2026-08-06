import type { NextFunction, Request, Response } from "express";

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
