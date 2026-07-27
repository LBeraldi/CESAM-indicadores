import { AvisoIndisponivel } from "@/components/AvisoIndisponivel";
import { RankingCompleto } from "@/components/RankingCompleto";
import { fetchApiResult, type Indicador } from "@/lib/api";
import { obterRankingSaneamento } from "@/lib/rankingSaneamento";

export default async function RankingPage() {
  const [indicadoresResult, rankingSaneamento] = await Promise.all([
    fetchApiResult<Indicador[]>("/indicadores", []),
    obterRankingSaneamento()
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {!indicadoresResult.disponivel ? (
        <div className="mb-5">
          <AvisoIndisponivel />
        </div>
      ) : null}
      <RankingCompleto indicadores={indicadoresResult.data} rankingSaneamento={rankingSaneamento} />
    </div>
  );
}
