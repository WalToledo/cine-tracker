import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";

describe("/api/reviews", () => {
  const authorEmail = `review-author-${randomUUID()}@example.com`;
  const otherEmail = `review-other-${randomUUID()}@example.com`;
  // Los guiones de `randomUUID` no valen como username, así que se quitan.
  const authorUsername = `author_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const otherUsername = `other_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  // movieId aleatorio para que el listado público sólo contenga las reseñas de este test.
  const movieId = 900_000 + Math.floor(Math.random() * 99_999);

  let authorToken: string;
  let authorId: string;
  let otherToken: string;
  let otherId: string;
  let reviewId: string;

  beforeAll(async () => {
    const author = await request(app).post("/api/auth/register").send({
      email: authorEmail,
      password: "SuperSecret123!",
      firstName: "Auto",
      lastName: "Ra",
      username: authorUsername,
    });

    expect(author.status).toBe(201);
    authorToken = author.body.token;
    authorId = author.body.user.id;

    const other = await request(app).post("/api/auth/register").send({
      email: otherEmail,
      password: "SuperSecret123!",
      firstName: "Otra",
      lastName: "Persona",
      username: otherUsername,
    });

    expect(other.status).toBe(201);
    otherToken = other.body.token;
    otherId = other.body.user.id;
  });

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { userId: { in: [authorId, otherId] } } });
    await prisma.user.deleteMany({ where: { email: { in: [authorEmail, otherEmail] } } });
    await prisma.$disconnect();
  });

  it("lists reviews of a movie without a token", async () => {
    const response = await request(app).get(`/api/reviews/movie/${movieId}`);

    expect(response.status).toBe(200);
    expect(response.body.reviews).toEqual([]);
  });

  it("rejects a non numeric movieId", async () => {
    const response = await request(app).get("/api/reviews/movie/not-a-number");

    expect(response.status).toBe(400);
  });

  it("rejects creating a review without a token", async () => {
    const response = await request(app)
      .post("/api/reviews")
      .send({ movieId, rating: 4, content: "Sin sesión no debería entrar" });

    expect(response.status).toBe(401);
  });

  it("rejects a rating outside 1-5", async () => {
    const response = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ movieId, rating: 9, content: "Puntuación inválida" });

    expect(response.status).toBe(400);
  });

  // El schema no coacciona: un rating en texto es un error del cliente.
  it("rejects a rating sent as a string", async () => {
    const response = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ movieId, rating: "4", content: "Puntuación en texto" });

    expect(response.status).toBe(400);
  });

  it("rejects an empty content", async () => {
    const response = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ movieId, rating: 4, content: "   " });

    expect(response.status).toBe(400);
  });

  it("creates a review", async () => {
    const response = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ movieId, rating: 4, content: "Una gran película." });

    expect(response.status).toBe(201);
    expect(response.body.review).toMatchObject({
      movieId,
      rating: 4,
      content: "Una gran película.",
    });

    reviewId = response.body.review.id;
  });

  it("rejects a second review of the same movie by the same user", async () => {
    const response = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ movieId, rating: 2, content: "Cambié de opinión." });

    expect(response.status).toBe(409);
  });

  it("exposes the author display name but never the email", async () => {
    const response = await request(app).get(`/api/reviews/movie/${movieId}`);

    expect(response.status).toBe(200);
    expect(response.body.reviews).toHaveLength(1);
    expect(response.body.reviews[0].author).toEqual({
      id: authorId,
      displayName: authorUsername,
    });
    expect(JSON.stringify(response.body)).not.toContain("@example.com");
  });

  it("updates the review of its owner", async () => {
    const response = await request(app)
      .patch(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ rating: 5, content: "Mejor de lo que recordaba." });

    expect(response.status).toBe(200);
    expect(response.body.review).toMatchObject({
      id: reviewId,
      rating: 5,
      content: "Mejor de lo que recordaba.",
    });
  });

  it("hides someone else's review from updates and deletes", async () => {
    const patch = await request(app)
      .patch(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ rating: 1 });

    expect(patch.status).toBe(404);

    const remove = await request(app)
      .delete(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(remove.status).toBe(404);
  });

  it("lets another user review the same movie", async () => {
    const response = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ movieId, rating: 3, content: "A mí me pareció correcta." });

    expect(response.status).toBe(201);

    const list = await request(app).get(`/api/reviews/movie/${movieId}`);
    expect(list.body.reviews).toHaveLength(2);
  });

  it("removes a review", async () => {
    const response = await request(app)
      .delete(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${authorToken}`);

    expect(response.status).toBe(204);

    const list = await request(app).get(`/api/reviews/movie/${movieId}`);
    expect(list.body.reviews).toHaveLength(1);
  });
});
