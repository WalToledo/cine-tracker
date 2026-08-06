import { describe, it, expect } from "vitest";
import { z } from "zod";

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_ERROR,
  PASSWORD_TOO_LONG_ERROR,
  passwordSchema,
} from "../lib/password";
import { firstIssueMessage } from "../middlewares/validate.middleware";

const TYPE_ERROR = "password is required";
const schema = passwordSchema(TYPE_ERROR);

/**
 * La misma tabla vive en `frontend/src/services/password.test.ts`. Si cambia una
 * regla hay que editar las dos: son dos implementaciones de la misma política en
 * runtimes que no comparten módulos.
 */
const CASES: Array<{ password: string; valid: boolean; reason: string }> = [
  { password: "abc", valid: false, reason: "demasiado corta" },
  { password: "abcdefgh", valid: false, reason: "sin mayúscula, número ni símbolo" },
  { password: "Abcdefgh", valid: false, reason: "sin número ni símbolo" },
  { password: "Abcdefg1", valid: false, reason: "sin símbolo" },
  { password: "ABC12345!", valid: false, reason: "sin minúscula" },
  { password: "abc12345!", valid: false, reason: "sin mayúscula" },
  { password: "Abcdefg!", valid: false, reason: "sin número" },
  { password: "Abc1234!", valid: true, reason: "el mínimo exacto de 8" },
  { password: "Abc12345!", valid: true, reason: "cumple el mínimo" },
  { password: "Abc12345!xyzQ", valid: true, reason: "cumple y es larga" },
];

describe("passwordSchema", () => {
  for (const { password, valid, reason } of CASES) {
    it(`${valid ? "accepts" : "rejects"} ${JSON.stringify(password)} (${reason})`, () => {
      expect(schema.safeParse(password).success).toBe(valid);
    });
  }

  it("rejects a password that is not a string with the type message", () => {
    const result = schema.safeParse(123);

    expect(result.success).toBe(false);
    expect(firstIssueMessage(result.error!)).toBe(TYPE_ERROR);
  });

  it("rejects an empty password with the type message, not the complexity one", () => {
    const result = schema.safeParse("");

    expect(result.success).toBe(false);
    expect(firstIssueMessage(result.error!)).toBe(TYPE_ERROR);
  });

  it("reports complexity failures with a single aggregated message", () => {
    const result = schema.safeParse("abc");

    expect(result.success).toBe(false);
    expect(firstIssueMessage(result.error!)).toBe(PASSWORD_ERROR);
  });

  it("rejects a password longer than bcrypt's limit with its own message", () => {
    const result = schema.safeParse(`Aa1!${"x".repeat(MAX_PASSWORD_LENGTH)}`);

    expect(result.success).toBe(false);
    expect(firstIssueMessage(result.error!)).toBe(PASSWORD_TOO_LONG_ERROR);
  });

  // Blinda la interpolación: si alguien toca el literal, el diccionario del
  // frontend deja de encontrarlo y el usuario ve el mensaje genérico.
  it("names every rule in the aggregated message", () => {
    expect(PASSWORD_ERROR).toContain(String(MIN_PASSWORD_LENGTH));
    expect(PASSWORD_ERROR).toContain("uppercase");
    expect(PASSWORD_ERROR).toContain("lowercase");
    expect(PASSWORD_ERROR).toContain("number");
    expect(PASSWORD_ERROR).toContain("special character");
  });
});

/**
 * `firstIssueMessage` se queda con `issues[0]`, así que el contrato de la API
 * depende de que Zod emita los issues en el orden de declaración del schema.
 * Este test lo deja escrito: si una versión futura lo cambiara, falla aquí en vez
 * de en media docena de suites con mensajes desconcertantes.
 */
describe("issue ordering", () => {
  const ordered = z.strictObject({
    first: z.string("first is required"),
    second: z.string("second is required"),
  });

  it("keeps the first declared key when several fields fail", () => {
    const result = ordered.safeParse({ first: 1, second: 2 });

    expect(result.success).toBe(false);
    expect(firstIssueMessage(result.error!)).toBe("first is required");
  });

  it("keeps the first failing check within a single field", () => {
    const result = schema.safeParse(123);

    expect(result.success).toBe(false);
    expect(result.error!.issues[0]?.message).toBe(TYPE_ERROR);
  });
});
