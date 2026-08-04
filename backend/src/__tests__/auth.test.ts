import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";

describe("POST /api/auth/register", () => {
  const email = `test-${randomUUID()}@example.com`;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("registers a user and returns a token without the password", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email, password: "SuperSecret123" });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(email);
    expect(response.body.user.password).toBeUndefined();
    expect(response.body.token).toEqual(expect.any(String));
  });
});
