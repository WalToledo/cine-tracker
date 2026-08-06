import { z } from "zod";

import { WatchStatus } from "../generated/prisma/enums";
import { movieIdSchema } from "./common.schema";

/** `title` y `posterPath` son `VARCHAR(191)`: sin este tope, Prisma daba un 500. */
const MAX_TITLE_LENGTH = 191;

export const TITLE_ERROR = "title is required";

export const TITLE_TOO_LONG_ERROR = `title must be at most ${MAX_TITLE_LENGTH} characters`;

export const POSTER_PATH_ERROR = `posterPath must be a string of at most ${MAX_TITLE_LENGTH} characters`;

export const STATUS_ERROR = "status must be PENDING or WATCHED";

export const addMovieSchema = z.strictObject({
  movieId: movieIdSchema,
  title: z
    .string(TITLE_ERROR)
    .min(1, TITLE_ERROR)
    .trim()
    .min(1, TITLE_ERROR)
    .max(MAX_TITLE_LENGTH, TITLE_TOO_LONG_ERROR),
  // Las películas sin póster llegan como `null` o directamente ausentes; ambas se
  // guardan como `null`, que es lo que espera la columna.
  posterPath: z
    .string(POSTER_PATH_ERROR)
    .max(MAX_TITLE_LENGTH, POSTER_PATH_ERROR)
    .nullish()
    .transform((value) => value ?? null),
});

export const updateStatusSchema = z.strictObject({
  status: z.enum(WatchStatus, STATUS_ERROR),
});

export type AddMovieBody = z.infer<typeof addMovieSchema>;
export type UpdateStatusBody = z.infer<typeof updateStatusSchema>;
