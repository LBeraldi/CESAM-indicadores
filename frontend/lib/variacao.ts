import type { SentidoIndicador } from "@/lib/api";

export type AvaliacaoVariacao = "melhora" | "piora" | "neutra";
export type DirecaoVariacao = "sobe" | "desce" | "estavel";

export type ResultadoVariacao = {
  direcao: DirecaoVariacao;
  avaliacao: AvaliacaoVariacao;
};

/**
 * DS-04: a seta segue a direção numérica; a cor e o texto seguem o sentido
 * do indicador informado pela API. Neutro ou variação zero nunca é
 * melhora nem piora.
 */
export function avaliarVariacao(variacao: number, sentido: SentidoIndicador): ResultadoVariacao {
  const direcao: DirecaoVariacao = variacao > 0 ? "sobe" : variacao < 0 ? "desce" : "estavel";

  if (direcao === "estavel" || sentido === "neutro") {
    return { direcao, avaliacao: "neutra" };
  }

  const melhorou = sentido === "maior_melhor" ? direcao === "sobe" : direcao === "desce";
  return { direcao, avaliacao: melhorou ? "melhora" : "piora" };
}
