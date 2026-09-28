import type { Municipio } from "@/lib/api";

export type MunicipioBusca = Pick<Municipio, "codigo_ibge" | "nome">;

export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

/** Aceita nome sem acento sensível ou código IBGE (CP-15.1). Quem começa com o termo vem primeiro. */
export function filtrarMunicipios<T extends MunicipioBusca>(municipios: T[], termo: string): T[] {
  const busca = normalizarBusca(termo);
  if (!busca) return [];

  if (/^\d+$/.test(busca)) {
    return municipios.filter((municipio) => municipio.codigo_ibge.startsWith(busca));
  }

  const comecam: T[] = [];
  const contem: T[] = [];
  for (const municipio of municipios) {
    const nome = normalizarBusca(municipio.nome);
    if (nome.startsWith(busca)) comecam.push(municipio);
    else if (nome.includes(busca)) contem.push(municipio);
  }
  const ordenar = (a: T, b: T) => a.nome.localeCompare(b.nome, "pt-BR");
  return [...comecam.sort(ordenar), ...contem.sort(ordenar)];
}
