import type { Metadata } from "next";
import { AvisoIndisponivel } from "@/components/AvisoIndisponivel";
import { RankingCompleto } from "@/components/RankingCompleto";
import { fetchApiResult, type Indicador, type Municipio } from "@/lib/api";
import { obterRankingSaneamento } from "@/lib/rankingSaneamento";

export const metadata: Metadata = {
  title: "Ranking de saneamento",
  description:
    "Ranking dos municípios de Mato Grosso do Sul por indicador de água, esgoto, resíduos sólidos e águas pluviais.",
  alternates: { canonical: "/ranking" }
};

export default async function RankingPage() {
  const [indicadoresResult, municipiosResult, rankingSaneamento] = await Promise.all([
    fetchApiResult<Indicador[]>("/indicadores", []),
    fetchApiResult<Municipio[]>("/municipios", []),
    obterRankingSaneamento()
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 lg:px-8">
      {!indicadoresResult.disponivel ? (
        <div className="mb-6">
          <AvisoIndisponivel />
        </div>
      ) : null}
      <RankingCompleto
        indicadores={indicadoresResult.data}
        rankingSaneamento={rankingSaneamento}
        municipios={municipiosResult.data}
      />
    </div>
  );
}
