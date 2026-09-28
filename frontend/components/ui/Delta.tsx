import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { SentidoIndicador } from "@/lib/api";
import { formatarVariacao } from "@/lib/formatters";
import { avaliarVariacao } from "@/lib/variacao";
import { cn } from "@/lib/utils";

const COR = {
  melhora: "text-sem-positive",
  piora: "text-sem-negative",
  neutra: "text-sem-neutral"
} as const;

/** CP-08: seta pela direção numérica; cor e texto pelo sentido do indicador. */
export function Delta({
  variacao,
  sentido,
  unidade,
  desde,
  mostrarAvaliacao = false,
  className
}: {
  variacao: number;
  sentido: SentidoIndicador;
  unidade: string | null | undefined;
  desde?: number;
  mostrarAvaliacao?: boolean;
  className?: string;
}) {
  const { direcao, avaliacao } = avaliarVariacao(variacao, sentido);
  const { numero, unidade: unidadeVariacao } = formatarVariacao(variacao, unidade);
  const Seta = direcao === "sobe" ? ArrowUp : direcao === "desce" ? ArrowDown : Minus;
  const verbo = direcao === "sobe" ? "subiu" : direcao === "desce" ? "caiu" : "ficou estável";
  const unidadeFalada = unidadeVariacao === "p.p." ? "pontos percentuais" : unidadeVariacao ?? "";
  const textoAcessivel = [
    direcao === "estavel" ? verbo : `${verbo} ${numero.replace(/^[+−]/, "")} ${unidadeFalada}`.trim(),
    desde ? `desde ${desde}` : null,
    avaliacao !== "neutra" ? avaliacao : null
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-medium", COR[avaliacao], className)}>
      <Seta className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span aria-hidden="true">
        <span className="font-data">{numero}</span>
        {unidadeVariacao ? <span className="ml-0.5 text-xs">{unidadeVariacao}</span> : null}
        {mostrarAvaliacao && avaliacao !== "neutra" ? <span className="ml-1 text-xs">· {avaliacao}</span> : null}
      </span>
      <span className="sr-only">{textoAcessivel}</span>
    </span>
  );
}
