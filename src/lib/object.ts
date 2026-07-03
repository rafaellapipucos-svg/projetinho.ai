/** Cópia rasa de um Record sem a chave indicada. */
export function omit<T>(
  record: Record<string, T>,
  key: string,
): Record<string, T> {
  const copy = { ...record };
  delete copy[key];
  return copy;
}
