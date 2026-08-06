import { z } from "zod";

import { movieIdSchema } from "./common.schema";

export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const MAX_CONTENT_LENGTH = 2000;

export const RATING_ERROR = `rating must be an integer between ${MIN_RATING} and ${MAX_RATING}`;

export const CONTENT_ERROR = `content is required and must be at most ${MAX_CONTENT_LENGTH} characters`;

export const EMPTY_REVIEW_PATCH_ERROR = "rating or content is required";

const ratingSchema = z.int(RATING_ERROR).min(MIN_RATING, RATING_ERROR).max(MAX_RATING, RATING_ERROR);

const contentSchema = z
  .string(CONTENT_ERROR)
  .min(1, CONTENT_ERROR)
  .trim()
  .min(1, CONTENT_ERROR)
  .max(MAX_CONTENT_LENGTH, CONTENT_ERROR);

export const createReviewSchema = z.strictObject({
  movieId: movieIdSchema,
  rating: ratingSchema,
  content: contentSchema,
});

export const updateReviewSchema = z
  .strictObject({
    rating: ratingSchema.optional(),
    content: contentSchema.optional(),
  })
  .refine(
    (patch) => Object.values(patch).some((value) => value !== undefined),
    EMPTY_REVIEW_PATCH_ERROR,
  );

export type CreateReviewBody = z.infer<typeof createReviewSchema>;
export type UpdateReviewBody = z.infer<typeof updateReviewSchema>;
