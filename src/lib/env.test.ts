import { describe, expect, it } from "vitest";
import { publicError, AppError } from "@/lib/errors";

describe("publicError", () => {
  it("hides unexpected internal details", () => {
    expect(publicError(new Error("database password"))).toEqual({ code: "INTERNAL_ERROR", message: "Ocurrió un error inesperado." });
  });

  it("keeps safe expected errors", () => {
    expect(publicError(new AppError("INVALID_INPUT", "Datos inválidos", 400))).toEqual({ code: "INVALID_INPUT", message: "Datos inválidos" });
  });
});
