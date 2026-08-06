import app from "./app";

const PORT = process.env.PORT || 4000;

// Sin la clave, `tmdb.service.ts` sirve el catálogo mockeado sin protestar. En
// desarrollo es cómodo; en producción es un fallo silencioso que se descubre
// mirando la portada, así que al menos se avisa al arrancar.
if (!process.env.TMDB_API_KEY?.trim()) {
  console.warn(
    "[warn] TMDB_API_KEY is not set: /api/movies will serve mock data instead of the real catalogue.",
  );
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${process.env.NODE_ENV ?? "development"})`);
});
