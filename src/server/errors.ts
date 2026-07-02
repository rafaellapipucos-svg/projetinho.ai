import "server-only";

/** Recurso não encontrado no escopo do tenant (ou não pertence a ele). */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Conflito de estado (nome duplicado, versão desatualizada etc.). */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
