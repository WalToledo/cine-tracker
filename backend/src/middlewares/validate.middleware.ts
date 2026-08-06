import type { RequestHandler } from "express";
import type { ZodError, ZodType } from "zod";

/**
 * El contrato de la API es `{ error }` con UN mensaje: el frontend lo traduce
 * buscándolo literalmente en un diccionario y no sabe leer un array de issues.
 *
 * Zod emite los issues en el orden en que se declaran las claves del schema, así
 * que el primero es determinista. Aun así los schemas están escritos para no
 * depender de ese orden: todos los checks de un mismo campo comparten mensaje, y
 * los de "falta el campo" comparten el mensaje agregado del endpoint.
 */
export function firstIssueMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "invalid request";
}

/**
 * Valida el body y lo sustituye por el resultado, de modo que el controlador
 * recibe los valores ya recortados y normalizados.
 *
 * Se usa `safeParse` y no `parse` porque `errorHandler` responde 500 a todo lo
 * que le llega: un `ZodError` suelto saldría como 500 en vez de como 400.
 */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    // Sin `Content-Type: application/json`, Express 5 deja `body` en undefined.
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      res.status(400).json({ error: firstIssueMessage(result.error) });
      return;
    }

    req.body = result.data;
    next();
  };
}

/**
 * El equivalente para la query string. El resultado va a `req.validatedQuery` y
 * no a `req.query`: en Express 5 esa propiedad es un getter del prototipo y
 * asignarla lanza un TypeError en tiempo de ejecución que `tsc` no detecta.
 */
export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      res.status(400).json({ error: firstIssueMessage(result.error) });
      return;
    }

    req.validatedQuery = result.data;
    next();
  };
}
