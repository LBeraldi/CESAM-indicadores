import { CloudRain, Droplets, Leaf, ShieldCheck, Trash2, Waves, type LucideIcon } from "lucide-react";

import type { ValorIndicador } from "@/lib/api";

export type TemaConfig = {
  icon: LucideIcon;
  bgClass: string;
  accentClass: string;
  panelClass: string;
};

const TEMA_ORDEM = ["Água", "Esgoto", "Resíduos sólidos", "Águas pluviais", "Gestão municipal"];

const TEMA_CONFIG: Record<string, TemaConfig> = {
  Água: {
    icon: Droplets,
    bgClass: "bg-[#0f766e]",
    accentClass: "bg-[#0f766e]",
    panelClass: "bg-[#e5f4f1] text-[#0f6f62]",
  },
  Esgoto: {
    icon: Waves,
    bgClass: "bg-[#0c2d57]",
    accentClass: "bg-[#0c2d57]",
    panelClass: "bg-[#e7edf5] text-[#0c2d57]",
  },
  "Resíduos sólidos": {
    icon: Trash2,
    bgClass: "bg-[#7a4e2d]",
    accentClass: "bg-[#7a4e2d]",
    panelClass: "bg-[#f3e9df] text-[#6b3f24]",
  },
  "Águas pluviais": {
    icon: CloudRain,
    bgClass: "bg-[#1f5f9f]",
    accentClass: "bg-[#1f5f9f]",
    panelClass: "bg-[#e7f0f8] text-[#1f5f9f]",
  },
  "Gestão municipal": {
    icon: ShieldCheck,
    bgClass: "bg-[#b7791f]",
    accentClass: "bg-[#b7791f]",
    panelClass: "bg-[#fbf1de] text-[#8f5f0d]",
  },
};

const TEMA_FALLBACK: TemaConfig = {
  icon: Leaf,
  bgClass: "bg-ms-navy",
  accentClass: "bg-ms-navy",
  panelClass: "bg-ms-sky text-ms-navy",
};

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

export function calcularScore(valores: ValorIndicador[]): number | null {
  const percentuais = valores
    .filter(
      (valor) =>
        valor.valor !== null && valor.indicador.unidade?.trim() === "%" && valor.indicador.sentido !== "neutro",
    )
    .map((valor) => {
      const numero = Number(valor.valor);
      return valor.indicador.sentido === "menor_melhor" ? 100 - numero : numero;
    });
  return percentuais.length ? percentuais.reduce((soma, valor) => soma + valor, 0) / percentuais.length : null;
}
