import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";

describe("/api/watchlist", () => {
  const email = `watchlist-${randomUUID()}@example.com`;
  // Los guiones de `randomUUID` no valen como username, así que se quitan.
  const username = `watchlist_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const movieId = 550;

  let token: string;
  let userId: string;
  let itemId: string;

  beforeAll(async () => {
    const response = await request(app).post("/api/auth/register").send({
      email,
      password: "SuperSecret123",
      firstName: "Watch",
      lastName: "Lister",
      username,
    });

    expect(response.status).toBe(201);

    token = response.body.token;
    userId = response.body.user.id;
  });

  afterAll(async () => {
    await prisma.watchlistItem.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("rejects requests without a token", async () => {
    const response = await request(app).get("/api/watchlist");

    expect(response.status).toBe(401);
  });

  it("adds a movie to the watchlist", async () => {
    const response = await request(app)
      .post("/api/watchlist")
      .set("Authorization", `Bearer ${token}`)
      .send({ movieId, title: "Fight Club", posterPath: "/poster.jpg" });

    expect(response.status).toBe(201);
    expect(response.body.item.movieId).toBe(movieId);
    expect(response.body.item.title).toBe("Fight Club");
    expect(response.body.item.status).toBe("PENDING");

    itemId = response.body.item.id;
  });

  it("rejects the same movie twice", async () => {
    const response = await request(app)
      .post("/api/watchlist")
      .set("Authorization", `Bearer ${token}`)
      .send({ movieId, title: "Fight Club" });

    expect(response.status).toBe(409);
  });

  it("updates the status of an item", async () => {
    const response = await request(app)
      .patch(`/api/watchlist/${itemId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "WATCHED" });

    expect(response.status).toBe(200);
    expect(response.body.item.status).toBe("WATCHED");
  });

  it("lists the watchlist of the authenticated user", async () => {
    const response = await request(app)
      .get("/api/watchlist")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      id: itemId,
      movieId,
      status: "WATCHED",
    });
  });

  it("removes a movie from the watchlist", async () => {
    const response = await request(app)
      .delete(`/api/watchlist/${itemId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(204);

    const list = await request(app)
      .get("/api/watchlist")
      .set("Authorization", `Bearer ${token}`);

    expect(list.body.items).toHaveLength(0);
  });
});
