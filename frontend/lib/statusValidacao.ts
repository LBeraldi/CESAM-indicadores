/** Status considerados oficiais pelo contrato atual da API. */
export function ehStatusOficial(status: string | null | undefined): boolean {
  return status?.trim().toLowerCase().startsWith("oficial_") ?? false;
}
