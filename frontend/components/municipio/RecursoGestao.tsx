import { ExternalLink, FileDown } from "lucide-react";

import type { Municipio, RecursoMunicipal, ValorIndicador } from "@/lib/api";
import { getRecursosGestaoMunicipal } from "@/lib/documentosGestaoMunicipal";

type Props = {
  valor: ValorIndicador;
  municipio: Municipio;
  recursos: RecursoMunicipal[];
};

export function RecursoGestao({ valor, municipio, recursos }: Props) {
  if (valor.valor === null || Number(valor.valor) <= 0) return null;

  const ehConselho = valor.indicador.codigo === "gestao_conselho_municipal";
  const ehPlano = valor.indicador.codigo === "gestao_plano_municipal_saneamento";
  if (!ehConselho && !ehPlano) return null;

  const recursosFallback = getRecursosGestaoMunicipal(municipio.codigo_ibge, municipio.nome);
  const recursoApi = recursos.find((item) => item.tipo === (ehConselho ? "conselho" : "plano_saneamento"));
  const recurso = recursoApi ?? (ehConselho ? recursosFallback.conselho : recursosFallback.plano);
  const Icon = ehPlano && recurso.direto ? FileDown : ExternalLink;
  const rotulo = ehConselho
    ? recurso.direto
      ? "Acessar conselho"
      : "Consultar controle social"
    : recurso.direto
      ? "Baixar plano municipal"
      : "Buscar documento oficial";

  return (
    <a
      href={recurso.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-current/25 bg-white/65 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-current/30"
      aria-label={`${rotulo} de ${municipio.nome}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {rotulo}
    </a>
  );
}
