export class AppError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 500) {
    super(message);
    this.name = "AppError";
  }
}

export function publicError(error: unknown) {
  if (error instanceof AppError && error.status < 500) return { code: error.code, message: error.message };
  return { code: "INTERNAL_ERROR", message: "Ocurrió un error inesperado." };
}
