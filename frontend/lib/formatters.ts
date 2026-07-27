import type { ValorIndicador } from "@/lib/api";

export function formatValorIndicador(valor: ValorIndicador): string {
  const unidade = valor.indicador.unidade ? ` ${valor.indicador.unidade}` : "";
  const unidadeNormalizada = valor.indicador.unidade?.toLocaleLowerCase("pt-BR");

  if (valor.valor === null) {
    return "Sem valor";
  }

  if (unidadeNormalizada === "sim/não" || unidadeNormalizada === "sim/nao") {
    return valor.valor >= 1 ? "Sim" : "Não";
  }

  return `${Number(valor.valor).toLocaleString("pt-BR")}${unidade}`;
}

export function valorParaPlanilha(valor: ValorIndicador): string {
  if (valor.valor === null) {
    return "";
  }

  const unidadeNormalizada = valor.indicador.unidade?.toLocaleLowerCase("pt-BR");
  if (unidadeNormalizada === "sim/não" || unidadeNormalizada === "sim/nao") {
    return valor.valor >= 1 ? "Sim" : "Não";
  }

  return String(valor.valor).replace(".", ",");
}
