/** Erro de regra do domínio — mensagens seguras para exibição. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
