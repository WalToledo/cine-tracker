import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";

// Los guiones de `randomUUID` no valen como username, así que se quitan.
function uniqueSuffix() {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

describe("/api/users/profile", () => {
  const email = `profile-${randomUUID()}@example.com`;
  const otherEmail = `profile-other-${randomUUID()}@example.com`;
  const otherUsername = `other_${uniqueSuffix()}`;
  // movieIds altos y aleatorios para no chocar con los de otras suites.
  const firstMovieId = 800_000 + Math.floor(Math.random() * 99_999);
  const secondMovieId = firstMovieId + 1;

  let token: string;
  let userId: string;
  let otherId: string;
  // Cambia a mitad de suite: el PATCH lo actualiza y los casos siguientes lo usan.
  let username = `profile_${uniqueSuffix()}`;

  beforeAll(async () => {
    const owner = await request(app).post("/api/auth/register").send({
      email,
      password: "SuperSecret123!",
      firstName: "Walter",
      lastName: "Toledo",
      username,
    });

    expect(owner.status).toBe(201);
    token = owner.body.token;
    userId = owner.body.user.id;

    const other = await request(app).post("/api/auth/register").send({
      email: otherEmail,
      password: "SuperSecret123!",
      firstName: "Otra",
      lastName: "Persona",
      username: otherUsername,
    });

    expect(other.status).toBe(201);
    otherId = other.body.user.id;
  });

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { userId: { in: [userId, otherId] } } });
    await prisma.watchlistItem.deleteMany({ where: { userId: { in: [userId, otherId] } } });
    await prisma.user.deleteMany({ where: { email: { in: [email, otherEmail] } } });
    await prisma.$disconnect();
  });

  it("rejects requests without a token", async () => {
    const response = await request(app).get("/api/users/profile");

    expect(response.status).toBe(401);
  });

  it("returns the profile with zero stats for a new user", async () => {
    const response = await request(app)
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.username).toBe(username);
    expect(response.body.user.firstName).toBe("Walter");
    expect(response.body.user.lastName).toBe("Toledo");
    expect(response.body.stats).toEqual({ watched: 0, pending: 0, reviews: 0 });
  });

  it("never exposes the password hash", async () => {
    const response = await request(app)
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(response.body.user.password).toBeUndefined();
  });

  it("counts watchlist items by status and reviews", async () => {
    const pending = await request(app)
      .post("/api/watchlist")
      .set("Authorization", `Bearer ${token}`)
      .send({ movieId: firstMovieId, title: "Pendiente" });

    expect(pending.status).toBe(201);

    const watched = await request(app)
      .post("/api/watchlist")
      .set("Authorization", `Bearer ${token}`)
      .send({ movieId: secondMovieId, title: "Vista" });

    expect(watched.status).toBe(201);

    const updated = await request(app)
      .patch(`/api/watchlist/${watched.body.item.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "WATCHED" });

    expect(updated.status).toBe(200);

    const review = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${token}`)
      .send({ movieId: secondMovieId, rating: 5, content: "Una maravilla." });

    expect(review.status).toBe(201);

    const response = await request(app)
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.stats).toEqual({ watched: 1, pending: 1, reviews: 1 });
  });

  it("updates the first name and the username", async () => {
    const renamed = `renamed_${uniqueSuffix()}`;

    const response = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Wally", username: renamed });

    expect(response.status).toBe(200);
    expect(response.body.user.firstName).toBe("Wally");
    expect(response.body.user.username).toBe(renamed);
    expect(response.body.user.lastName).toBe("Toledo");
    expect(response.body.stats).toBeUndefined();

    username = renamed;
  });

  it("rejects an empty patch", async () => {
    const response = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("firstName, lastName or username is required");
  });

  // Los tipos se rechazan en el schema: sin eso, un número llegaba hasta Prisma.
  it("rejects a firstName that is not a string", async () => {
    const response = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: 5 });

    expect(response.status).toBe(400);
  });

  it("rejects an invalid username", async () => {
    const response = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "con espacios" });

    expect(response.status).toBe(400);
  });

  it("rejects a username already taken by another user", async () => {
    const response = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: otherUsername });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("username already taken");
  });

  // El índice único ignora las mayúsculas, así que el propio username casa con la
  // fila de uno mismo: cambiar sólo la capitalización debe permitirse.
  it("accepts its own username in a different case", async () => {
    const response = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: username.toUpperCase() });

    expect(response.status).toBe(200);
    expect(response.body.user.username).toBe(username.toUpperCase());
  });
});
