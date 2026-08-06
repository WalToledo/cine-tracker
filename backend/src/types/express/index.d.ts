declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
      /**
       * Lo deja `validateQuery`. Vive aparte porque `req.query` es un getter en
       * Express 5 y no se puede reasignar. Es `unknown` para que el controlador
       * tenga que declarar de qué schema viene.
       */
      validatedQuery?: unknown;
    }
  }
}

export {};
