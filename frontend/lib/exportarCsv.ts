import type { Municipio, ValorIndicador } from "@/lib/api";
import { valorParaPlanilha } from "@/lib/formatters";

function csvEscape(value: string | number | null | undefined): string {
  const texto = value === null || value === undefined ? "" : String(value);
  return `"${texto.replaceAll('"', '""')}"`;
}

export function baixarCsvMunicipal(municipio: Municipio, valores: ValorIndicador[]) {
  const linhas = [
    [
      "codigo_ibge",
      "municipio",
      "uf",
      "ano_referencia",
      "tema",
      "indicador_codigo",
      "indicador_nome",
      "valor",
      "unidade",
      "fonte",
      "status_validacao",
      "observacoes",
    ],
    ...valores.map((valor) => [
      municipio.codigo_ibge,
      municipio.nome,
      municipio.uf,
      valor.ano,
      valor.indicador.tema,
      valor.indicador.codigo,
      valor.indicador.nome,
      valorParaPlanilha(valor),
      valor.indicador.unidade ?? "",
      valor.fonte ?? valor.indicador.fonte ?? "",
      valor.status_validacao,
      valor.observacoes ?? "",
    ]),
  ];
  const csv = linhas.map((linha) => linha.map(csvEscape).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `observatorio-saneamento_${municipio.codigo_ibge}_${municipio.nome.replaceAll(" ", "_")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
