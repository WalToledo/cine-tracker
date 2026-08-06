import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { PASSWORD_ERROR } from "../lib/password";
import { EMAIL_ERROR } from "../schemas/auth.schema";
import { rawAuthCookie } from "./helpers";

/**
 * La garantía del Step 13: el token sale en una cookie que el navegador no deja
 * leer por JavaScript, y no en el body donde cualquier XSS lo alcanzaría.
 */
function expectSessionCookie(response: request.Response) {
  const cookie = rawAuthCookie(response);

  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=Lax");
  expect(cookie).toContain("Path=/");
  expect(response.body.token).toBeUndefined();
}

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

  it("registers a user and sets the session cookie without the password", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email,
      password: "SuperSecret123!",
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
    expectSessionCookie(response);
  });

  it("rejects a registration without the profile fields", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: `test-${randomUUID()}@example.com`, password: "SuperSecret123!" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("username");
  });

  it("rejects a username with invalid characters", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: `test-${randomUUID()}@example.com`,
      password: "SuperSecret123!",
      firstName: "Walter",
      lastName: "Toledo",
      username: "con espacios",
    });

    expect(response.status).toBe(400);
  });

  it("rejects a duplicate username", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: `test-${randomUUID()}@example.com`,
      password: "SuperSecret123!",
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
      password: "SuperSecret123!",
      firstName: "Walter",
      lastName: "Toledo",
      username: `Case_${uniqueSuffix()}`,
    });

    expect(first.status).toBe(201);

    const response = await request(app).post("/api/auth/register").send({
      email: `test-${randomUUID()}@example.com`,
      password: "SuperSecret123!",
      firstName: "Otra",
      lastName: "Persona",
      username: first.body.user.username.toLowerCase(),
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("username already taken");
  });

  // Registro válido salvo por la contraseña, para aislar cada regla.
  function registerWith(password: unknown) {
    return request(app)
      .post("/api/auth/register")
      .send({
        email: `test-${randomUUID()}@example.com`,
        password,
        firstName: "Walter",
        lastName: "Toledo",
        username: `pass_${uniqueSuffix()}`,
      });
  }

  it("rejects a password without a special character", async () => {
    const response = await registerWith("SuperSecret123");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(PASSWORD_ERROR);
  });

  it("rejects a password shorter than eight characters", async () => {
    const response = await registerWith("Ab1!cde");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(PASSWORD_ERROR);
  });

  // Antes esto llegaba a `bcrypt.hash` y reventaba con un 500.
  it("rejects a password that is not a string", async () => {
    const response = await registerWith(123);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("password");
  });

  it("rejects an email with no valid format", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "noesunemail",
      password: "SuperSecret123!",
      firstName: "Walter",
      lastName: "Toledo",
      username: `mail_${uniqueSuffix()}`,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(EMAIL_ERROR);
  });

  it("rejects an unknown field in the body", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: `test-${randomUUID()}@example.com`,
      password: "SuperSecret123!",
      firstName: "Walter",
      lastName: "Toledo",
      username: `extra_${uniqueSuffix()}`,
      isAdmin: true,
    });

    expect(response.status).toBe(400);
  });

  it("accepts a password with exactly the minimum length", async () => {
    const minimumEmail = `test-${randomUUID()}@example.com`;
    createdEmails.push(minimumEmail);

    const response = await request(app).post("/api/auth/register").send({
      email: minimumEmail,
      password: "Abc1234!",
      firstName: "Walter",
      lastName: "Toledo",
      username: `min_${uniqueSuffix()}`,
    });

    expect(response.status).toBe(201);
  });

  it("stores the email in lowercase", async () => {
    const upperEmail = `TEST-${randomUUID().toUpperCase()}@Example.COM`;
    createdEmails.push(upperEmail.toLowerCase());

    const response = await request(app).post("/api/auth/register").send({
      email: upperEmail,
      password: "SuperSecret123!",
      firstName: "Walter",
      lastName: "Toledo",
      username: `case_${uniqueSuffix()}`,
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(upperEmail.toLowerCase());
  });
});

describe("POST /api/auth/login", () => {
  const email = `login-${randomUUID()}@example.com`;
  const password = "SuperSecret123!";
  const username = `login_${randomUUID().replace(/-/g, "").slice(0, 12)}`;

  // Una cuenta anterior al Step 11: su contraseña ya no pasaría el registro.
  const legacyEmail = `legacy-${randomUUID()}@example.com`;
  const legacyPassword = "legacy1";
  const legacyUsername = `legacy_${randomUUID().replace(/-/g, "").slice(0, 12)}`;

  beforeAll(async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email, password, firstName: "Walter", lastName: "Toledo", username });

    expect(response.status).toBe(201);

    // Se siembra directo en la base: la API ya no dejaría crearla.
    await prisma.user.create({
      data: {
        email: legacyEmail,
        password: await bcrypt.hash(legacyPassword, 10),
        firstName: "Vieja",
        lastName: "Cuenta",
        username: legacyUsername,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [email, legacyEmail] } } });
    await prisma.$disconnect();
  });

  it("sets the session cookie and hides the password hash", async () => {
    const response = await request(app).post("/api/auth/login").send({ email, password });

    expect(response.status).toBe(200);
    expectSessionCookie(response);
    expect(response.body.user.password).toBeUndefined();
  });

  it("finds the account whatever the capitalisation of the email", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: email.toUpperCase(), password });

    expect(response.status).toBe(200);
  });

  it("rejects a wrong password without saying which field failed", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "OtraCosa123!" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid credentials");
  });

  it("gives the same answer for an unknown email", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: `ghost-${randomUUID()}@example.com`, password });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid credentials");
  });

  it("rejects a request without a password", async () => {
    const response = await request(app).post("/api/auth/login").send({ email });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("email and password are required");
  });

  /**
   * La garantía contra el lockout: si el login llegara a aplicar la política del
   * registro, todas las cuentas anteriores al Step 11 se quedarían fuera.
   */
  it("lets a pre-Step-11 account in with a password the register would reject", async () => {
    const rejected = await request(app).post("/api/auth/register").send({
      email: `other-${randomUUID()}@example.com`,
      password: legacyPassword,
      firstName: "Vieja",
      lastName: "Cuenta",
      username: `nope_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    });
    expect(rejected.status).toBe(400);

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: legacyEmail, password: legacyPassword });

    expect(response.status).toBe(200);
    expectSessionCookie(response);
  });
});

describe("POST /api/auth/logout", () => {
  it("expires the session cookie", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(204);
    // `Expires` en el pasado es como el navegador entiende "bórrala".
    expect(rawAuthCookie(response)).toContain("Expires=Thu, 01 Jan 1970");
  });

  // Sin token no puede responder 401: es justo cuando el usuario quiere salir.
  it("works without a session cookie", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(204);
  });
});
