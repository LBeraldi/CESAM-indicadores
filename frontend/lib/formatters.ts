import type { ValorIndicador } from "@/lib/api";

/** Número e unidade separados: o número vai em fonte mono, a unidade em texto menor (DS-06). */
export type ValorFormatado = {
  numero: string;
  unidade: string | null;
};

export const SEM_DADO = "—";

type RegraUnidade = { casas: number; fixas: boolean };

// DS-07: casas decimais por unidade. O que não está listado usa até 2 casas.
const REGRAS_UNIDADE: Record<string, RegraUnidade> = {
  "%": { casas: 1, fixas: true },
  "l/hab.dia": { casas: 1, fixas: true },
  "kg/hab.dia": { casas: 2, fixas: true },
  "kg/hab.ano": { casas: 1, fixas: true },
  km: { casas: 0, fixas: true },
  "km²": { casas: 1, fixas: true },
  "hab.": { casas: 0, fixas: true }
};

function normalizarUnidade(unidade: string | null | undefined): string {
  return unidade?.trim().toLocaleLowerCase("pt-BR") ?? "";
}

export function ehUnidadeBinaria(unidade: string | null | undefined): boolean {
  const normalizada = normalizarUnidade(unidade);
  return normalizada === "sim/não" || normalizada === "sim/nao";
}

/** Troca o hífen pelo sinal de menos tipográfico. */
function comMenosTipografico(texto: string): string {
  return texto.replace(/^-/, "−");
}

export function formatarNumero(valor: number, casas: number, fixas = true): string {
  return comMenosTipografico(
    valor.toLocaleString("pt-BR", {
      minimumFractionDigits: fixas ? casas : 0,
      maximumFractionDigits: casas
    })
  );
}

/** Formata um valor para exibição conforme a unidade (DS-07). Só exibição: o CSV usa valorParaPlanilha. */
export function formatarValor(valor: number | null | undefined, unidade: string | null | undefined): ValorFormatado {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return { numero: SEM_DADO, unidade: null };
  }

  if (ehUnidadeBinaria(unidade)) {
    return { numero: valor >= 1 ? "Sim" : "Não", unidade: null };
  }

  const regra = REGRAS_UNIDADE[normalizarUnidade(unidade)];
  const numero = regra ? formatarNumero(valor, regra.casas, regra.fixas) : formatarNumero(valor, 2, false);
  const unidadeLimpa = unidade?.trim() || null;

  return { numero, unidade: unidadeLimpa };
}

/** Nota 0–100: uma casa decimal fixa. */
export function formatarNota(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return SEM_DADO;
  }
  return formatarNumero(valor, 1);
}

export function formatarPopulacao(valor: number | null | undefined): string {
  return valor ? formatarNumero(valor, 0) : SEM_DADO;
}

export function formatarArea(valor: number | null | undefined): string {
  return valor ? formatarNumero(valor, 1) : SEM_DADO;
}

/** Variação entre dois anos, com sinal explícito. Para %, a unidade vira "p.p." (DS-07). */
export function formatarVariacao(variacao: number, unidade: string | null | undefined): ValorFormatado {
  const normalizada = normalizarUnidade(unidade);
  const regra = REGRAS_UNIDADE[normalizada];
  const casas = regra?.casas ?? 2;
  const absoluto = formatarNumero(Math.abs(variacao), casas, regra?.fixas ?? false);
  const sinal = variacao > 0 ? "+" : variacao < 0 ? "−" : "";

  return {
    numero: `${sinal}${absoluto}`,
    unidade: normalizada === "%" ? "p.p." : unidade?.trim() || null
  };
}

export function formatValorIndicador(valor: ValorIndicador): string {
  const { numero, unidade } = formatarValor(valor.valor, valor.indicador.unidade);
  return unidade ? `${numero} ${unidade}` : numero;
}

export function valorParaPlanilha(valor: ValorIndicador): string {
  if (valor.valor === null) {
    return "";
  }

  if (ehUnidadeBinaria(valor.indicador.unidade)) {
    return valor.valor >= 1 ? "Sim" : "Não";
  }

  return String(valor.valor).replace(".", ",");
}
