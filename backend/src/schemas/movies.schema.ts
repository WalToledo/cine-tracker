import { z } from "zod";

import { MAX_SEARCH_PAGE } from "../services/tmdb.service";

export const QUERY_ERROR = "q is required";

export const PAGE_ERROR = `page must be an integer between 1 and ${MAX_SEARCH_PAGE}`;

/**
 * `z.object` y no `z.strictObject`: la query puede traer parámetros ajenos
 * (utm, etc.) y rechazar la petición por eso sería hostil.
 */
export const searchQuerySchema = z.object({
  q: z.string(QUERY_ERROR).min(1, QUERY_ERROR).trim().min(1, QUERY_ERROR),
  // El `default` corta el `undefined` antes de que `coerce` lo convierta en NaN.
  page: z.coerce
    .number(PAGE_ERROR)
    .int(PAGE_ERROR)
    .min(1, PAGE_ERROR)
    .max(MAX_SEARCH_PAGE, PAGE_ERROR)
    .default(1),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
