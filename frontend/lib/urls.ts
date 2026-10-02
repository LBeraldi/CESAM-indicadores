/** Aceita somente links navegáveis e seguros para sites externos. */
export function urlExternaSegura(valor: string | null | undefined): string | null {
  if (!valor?.trim()) return null;

  try {
    const url = new URL(valor.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
