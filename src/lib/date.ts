/** Datas centralizadas (Intl pt-BR) — nunca formatar inline. */

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: Date | string): string {
  return dateFormatter.format(
    typeof value === "string" ? new Date(value) : value,
  );
}

export function formatDateTime(value: Date | string): string {
  return dateTimeFormatter.format(
    typeof value === "string" ? new Date(value) : value,
  );
}

/** Idade completa em anos na data de hoje. */
export function ageFrom(birthDate: Date | string): number {
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && now.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

/** Date → "YYYY-MM-DD" (valor de <input type="date">). */
export function toDateInputValue(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}
