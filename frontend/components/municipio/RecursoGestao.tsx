import { ExternalLink, FileDown } from "lucide-react";

import type { Municipio, RecursoMunicipal, ValorIndicador } from "@/lib/api";
import { getRecursosGestaoMunicipal } from "@/lib/documentosGestaoMunicipal";
import { urlExternaSegura } from "@/lib/urls";

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
  const recursoUrl = urlExternaSegura(recurso.url);
  if (!recursoUrl) return null;
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
      href={recursoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="no-print mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ms-blue hover:underline"
      aria-label={`${rotulo} de ${municipio.nome} (abre em nova aba)`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      {rotulo}
    </a>
  );
}
