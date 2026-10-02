import { CloudRain, Droplets, Leaf, ShieldCheck, Trash2, Waves, type LucideIcon } from "lucide-react";

import type { ValorIndicador } from "@/lib/api";
import type { RankingSaneamentoItem } from "@/lib/rankingSaneamento";
import { ehPercentual } from "@/lib/formatters";
import { ehStatusOficial } from "@/lib/statusValidacao";

type ChaveModulo = "agua" | "esgoto" | "residuos" | "aguasPluviais" | "gestao";

// DS-03: a cor da dimensão só identifica (ícone, marcador, linha, barra),
// sempre acompanhada do ícone e do nome. Nunca como fundo de bloco inteiro.
export type TemaConfig = {
  icon: LucideIcon;
  nomeCurto: string;
  /** Cor da dimensão como valor CSS, para SVG. */
  cor: string;
  textClass: string;
  bgClass: string;
  /** Campo da nota do módulo em RankingSaneamentoItem (ADR-001). */
  modulo: ChaveModulo | null;
};

export const TEMA_ORDEM = ["Água", "Esgoto", "Resíduos sólidos", "Águas pluviais", "Gestão municipal"];

const TEMA_CONFIG: Record<string, TemaConfig> = {
  Água: {
    icon: Droplets,
    nomeCurto: "Água",
    cor: "var(--dim-agua)",
    textClass: "text-dim-agua",
    bgClass: "bg-dim-agua",
    modulo: "agua",
  },
  Esgoto: {
    icon: Waves,
    nomeCurto: "Esgoto",
    cor: "var(--dim-esgoto)",
    textClass: "text-dim-esgoto",
    bgClass: "bg-dim-esgoto",
    modulo: "esgoto",
  },
  "Resíduos sólidos": {
    icon: Trash2,
    nomeCurto: "Resíduos",
    cor: "var(--dim-residuos)",
    textClass: "text-dim-residuos",
    bgClass: "bg-dim-residuos",
    modulo: "residuos",
  },
  "Águas pluviais": {
    icon: CloudRain,
    nomeCurto: "Pluviais",
    cor: "var(--dim-pluviais)",
    textClass: "text-dim-pluviais",
    bgClass: "bg-dim-pluviais",
    modulo: "aguasPluviais",
  },
  "Gestão municipal": {
    icon: ShieldCheck,
    nomeCurto: "Gestão",
    cor: "var(--dim-gestao)",
    textClass: "text-dim-gestao",
    bgClass: "bg-dim-gestao",
    modulo: "gestao",
  },
};

const TEMA_FALLBACK: TemaConfig = {
  icon: Leaf,
  nomeCurto: "Outros",
  cor: "var(--color-navy)",
  textClass: "text-ms-navy",
  bgClass: "bg-ms-navy",
  modulo: null,
};

/** Nota do módulo usada no ranking (ADR-001: um número por conceito em todo o site). */
export function notaDoModulo(item: RankingSaneamentoItem | null | undefined, tema: string): number | null {
  const modulo = temaConfig(tema).modulo;
  if (!item || !modulo) return null;
  return item[modulo];
}

export function ordenarTexto(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

export function temaConfig(tema: string): TemaConfig {
  return TEMA_CONFIG[tema] ?? TEMA_FALLBACK;
}

export function ordemTema(tema: string): number {
  const index = TEMA_ORDEM.indexOf(tema);
  return index === -1 ? TEMA_ORDEM.length : index;
}

export type CoberturaTema = {
  tema: string;
  config: TemaConfig;
  coberto: boolean;
};

/**
 * Um tema conta como coberto quando há pelo menos um valor não nulo com
 * status_validacao "oficial_sinisa" ou "oficial_snis" — a união das duas
 * fontes oficiais, não só a mais recente. Propositalmente mais permissivo
 * que o padrão de app/scripts/relatorio_cobertura_temas.py (que isola
 * --fonte oficial_sinisa): aqui o objetivo é responder "o site tem algum
 * dado oficial pra mostrar nesse tema", não "o SINISA 2023 cobriu esse
 * município".
 */
export function calcularCobertura(indicadores: ValorIndicador[]): CoberturaTema[] {
  const temasComDadoOficial = new Set(
    indicadores
      .filter((valor) => valor.valor !== null && ehStatusOficial(valor.status_validacao))
      .map((valor) => valor.indicador.tema),
  );

  return TEMA_ORDEM.map((tema) => ({
    tema,
    config: temaConfig(tema),
    coberto: temasComDadoOficial.has(tema),
  }));
}

export function calcularScore(valores: ValorIndicador[]): number | null {
  const percentuais = valores
    .filter(
      (valor) =>
        valor.valor !== null && ehPercentual(valor.indicador.unidade) && valor.indicador.sentido !== "neutro",
    )
    .map((valor) => {
      const numero = Number(valor.valor);
      return valor.indicador.sentido === "menor_melhor" ? 100 - numero : numero;
    });
  return percentuais.length ? percentuais.reduce((soma, valor) => soma + valor, 0) / percentuais.length : null;
}
