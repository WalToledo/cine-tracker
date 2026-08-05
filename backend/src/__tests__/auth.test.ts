import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";

// Los guiones de `randomUUID` no valen como username, así que se quitan.
function uniqueSuffix() {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

describe("POST /api/auth/register", () => {
  const email = `test-${randomUUID()}@example.com`;
  const username = `test_${uniqueSuffix()}`;

  // Cada caso que llega a crear una cuenta apunta aquí su email para limpiarlo.
  const createdEmails = [email];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await prisma.$disconnect();
  });

  it("registers a user and returns a token without the password", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email,
      password: "SuperSecret123",
      firstName: "Walter",
      lastName: "Toledo",
      username,
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(email);
    expect(response.body.user.username).toBe(username);
    expect(response.body.user.firstName).toBe("Walter");
    expect(response.body.user.lastName).toBe("Toledo");
    expect(response.body.user.password).toBeUndefined();
    expect(response.body.token).toEqual(expect.any(String));
  });

  it("rejects a registration without the profile fields", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: `test-${randomUUID()}@example.com`, password: "SuperSecret123" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("username");
  });

  it("rejects a username with invalid characters", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: `test-${randomUUID()}@example.com`,
      password: "SuperSecret123",
      firstName: "Walter",
      lastName: "Toledo",
      username: "con espacios",
    });

    expect(response.status).toBe(400);
  });

  it("rejects a duplicate username", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: `test-${randomUUID()}@example.com`,
      password: "SuperSecret123",
      firstName: "Otra",
      lastName: "Persona",
      username,
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("username already taken");
  });

  // La collation de MySQL ignora las mayúsculas: es una decisión de diseño para
  // que nadie suplante a otro cambiando sólo la capitalización.
  it("rejects a username that only differs in case", async () => {
    const takenEmail = `test-${randomUUID()}@example.com`;
    createdEmails.push(takenEmail);

    const first = await request(app).post("/api/auth/register").send({
      email: takenEmail,
      password: "SuperSecret123",
      firstName: "Walter",
      lastName: "Toledo",
      username: `Case_${uniqueSuffix()}`,
    });

    expect(first.status).toBe(201);

    const response = await request(app).post("/api/auth/register").send({
      email: `test-${randomUUID()}@example.com`,
      password: "SuperSecret123",
      firstName: "Otra",
      lastName: "Persona",
      username: first.body.user.username.toLowerCase(),
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("username already taken");
  });
});
