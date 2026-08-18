import type { Metadata } from "next";
import { AvisoIndisponivel } from "@/components/AvisoIndisponivel";
import { TabelaMunicipios } from "@/components/TabelaMunicipios";
import { fetchApiResult, type Municipio } from "@/lib/api";
import { obterRankingSaneamento } from "@/lib/rankingSaneamento";

export const metadata: Metadata = {
  title: "Municípios",
  description:
    "Lista dos 79 municípios de Mato Grosso do Sul com indicadores de água, esgoto, resíduos sólidos e águas pluviais.",
  alternates: { canonical: "/municipios" }
};

export default async function MunicipiosPage() {
  const [municipiosResult, rankingSaneamento] = await Promise.all([
    fetchApiResult<Municipio[]>("/municipios", []),
    obterRankingSaneamento()
  ]);

  const codigosComDados = new Set(rankingSaneamento.map((item) => item.codigo_ibge));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {!municipiosResult.disponivel ? (
        <div className="mb-5">
          <AvisoIndisponivel />
        </div>
      ) : null}
      <TabelaMunicipios municipios={municipiosResult.data} codigosComDados={codigosComDados} />
    </div>
  );
}
