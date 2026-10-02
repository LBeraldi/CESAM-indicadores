/**
 * PG-03.12: resumo de uma linha do prestador, derivado só do texto do SINISA.
 * "Com delegação atendendo Sede e Localidades - DSL" → ["Delegação", "Sede e localidades"].
 */
export function resumoAtuacao(area: string | null | undefined): string[] {
  const texto = area?.trim();
  if (!texto) return [];
  const partes = /^(com|sem) delegação atendendo (.+?)(?:\s+-\s+\w+)?$/i.exec(texto);
  if (!partes) return [texto];
  const delegacao = partes[1].toLocaleLowerCase("pt-BR") === "com" ? "Delegação" : "Sem delegação";
  const atendida = partes[2].toLocaleLowerCase("pt-BR");
  return [delegacao, atendida.charAt(0).toLocaleUpperCase("pt-BR") + atendida.slice(1)];
}

/** "SINISA 2024 - Abastecimento de Agua, ..." → "SINISA 2024". Outros textos ficam como estão. */
export function fonteCurta(fonte: string | null | undefined): string {
  const texto = fonte?.trim() ?? "";
  const partes = /^(SINISA|SNIS)\b\D*((?:19|20)\d{2})/i.exec(texto);
  return partes ? `${partes[1].toUpperCase()} ${partes[2]}` : texto;
}
