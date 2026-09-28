export type ClasseEscala = 1 | 2 | 3 | 4 | 5;

/** Limites fixos da nota 0–100 (DS-05): permitem comparar anos diferentes. */
export const LIMITES_NOTA = [20, 40, 60, 80] as const;

export function classeDaNota(valor: number | null | undefined): ClasseEscala | null {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return null;
  }
  if (valor < LIMITES_NOTA[0]) return 1;
  if (valor < LIMITES_NOTA[1]) return 2;
  if (valor < LIMITES_NOTA[2]) return 3;
  if (valor < LIMITES_NOTA[3]) return 4;
  return 5;
}

/**
 * Quebras por quintis para indicadores que não são nota (DS-05). Retorna os
 * quatro limites internos, declarados na legenda com os valores numéricos.
 */
export function quebrasPorQuintil(valores: number[]): number[] {
  const ordenados = [...valores].filter((valor) => !Number.isNaN(valor)).sort((a, b) => a - b);
  if (ordenados.length === 0) {
    return [];
  }

  return [0.2, 0.4, 0.6, 0.8].map((fracao) => {
    const posicao = (ordenados.length - 1) * fracao;
    const base = Math.floor(posicao);
    const resto = posicao - base;
    const proximo = ordenados[Math.min(base + 1, ordenados.length - 1)];
    return ordenados[base] + (proximo - ordenados[base]) * resto;
  });
}

/**
 * Classe de um valor dadas as quebras. Para indicadores em que menor é melhor,
 * a escala é invertida: a classe mais escura corresponde ao menor valor.
 */
export function classePorQuebras(
  valor: number | null | undefined,
  quebras: number[],
  menorMelhor = false
): ClasseEscala | null {
  if (valor === null || valor === undefined || Number.isNaN(valor) || quebras.length === 0) {
    return null;
  }

  const indice = quebras.filter((limite) => valor >= limite).length;
  const classe = (Math.min(4, indice) + 1) as ClasseEscala;
  return menorMelhor ? ((6 - classe) as ClasseEscala) : classe;
}

export const COR_CLASSE: Record<ClasseEscala, string> = {
  1: "var(--seq-1)",
  2: "var(--seq-2)",
  3: "var(--seq-3)",
  4: "var(--seq-4)",
  5: "var(--seq-5)"
};
