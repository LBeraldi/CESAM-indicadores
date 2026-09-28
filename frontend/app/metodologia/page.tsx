import type { Metadata } from "next";
import Link from "next/link";
import { AvisoIndisponivel } from "@/components/AvisoIndisponivel";
import { ordemTema, ordenarTexto, temaConfig } from "@/components/municipio/fichaConfig";
import { Badge } from "@/components/ui/Badge";
import { fetchApiResult, type Indicador, type SentidoIndicador } from "@/lib/api";
import { PESOS_RANKING_SANEAMENTO } from "@/lib/rankingSaneamento";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Metodologia e fontes",
  description:
    "Como o Observatório de Saneamento organiza os dados oficiais, lê o sentido de cada indicador e compõe a nota geral do ranking municipal.",
  alternates: { canonical: "/metodologia" }
};

const ROTULO_SENTIDO: Record<SentidoIndicador, string> = {
  maior_melhor: "maior é melhor",
  menor_melhor: "menor é melhor",
  neutro: "neutro"
};

const pct = (valor: number) => Math.round(valor * 100);

const SECOES = [
  { id: "nota", rotulo: "Nota geral e ranking" },
  { id: "sentido", rotulo: "Sentido dos indicadores" },
  { id: "fontes", rotulo: "Fontes de dados" },
  { id: "rastreabilidade", rotulo: "Padronização e rastreabilidade" }
];

// Conteúdo extraído de docs/metodologia.md e docs/fontes-de-dados.md (PG-05.1).
// Texto metodológico novo só com aprovação da equipe (PG-05.2).
export default async function MetodologiaPage() {
  const indicadoresResult = await fetchApiResult<Indicador[]>("/indicadores", []);
  const grupos = new Map<string, Indicador[]>();
  for (const indicador of indicadoresResult.data) {
    const lista = grupos.get(indicador.tema) ?? [];
    lista.push(indicador);
    grupos.set(indicador.tema, lista);
  }
  const temas = Array.from(grupos.entries()).sort((a, b) => ordemTema(a[0]) - ordemTema(b[0]) || ordenarTexto(a[0], b[0]));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 lg:px-8">
      <nav aria-label="Trilha de navegação" className="text-sm text-ms-muted">
        <Link href="/" className="hover:text-ms-blue">
          Início
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ms-ink">Metodologia e fontes</span>
      </nav>
      <p className="eyebrow mt-4">Transparência metodológica</p>
      <h1 className="t-h1 mt-3 text-ms-ink">Metodologia e fontes</h1>
      <p className="mt-3 max-w-3xl text-base leading-[26px] text-ms-muted">
        O Observatório de Saneamento é uma plataforma para organizar indicadores municipais de saneamento e
        infraestrutura dos municípios de Mato Grosso do Sul.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Nesta página" className="lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
          <p className="t-label text-ms-muted">Nesta página</p>
          <ul className="mt-3 grid gap-1 border-l border-ms-line text-sm">
            {SECOES.map((secao) => (
              <li key={secao.id}>
                <a href={`#${secao.id}`} className="-ml-px block border-l-2 border-transparent py-1 pl-3 text-ms-muted hover:border-ms-blue hover:text-ms-ink">
                  {secao.rotulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid min-w-0 max-w-3xl gap-12">
          <section id="nota" aria-labelledby="nota-titulo" className="grid gap-4 text-base leading-[26px] text-ms-ink">
            <h2 id="nota-titulo" className="t-h2">
              Nota geral e ranking municipal
            </h2>
            <p>
              O ranking municipal é um cálculo próprio do Observatório, inspirado no sistema de indicadores do Guia de
              Referência para Medição do Desempenho (GRMD) do PNQS/ABES. Ele não é uma classificação, nota, certificação
              ou premiação oficial da ABES. O PNQS avalia organizações de saneamento por metodologia própria; aqui, a
              referência foi adaptada à unidade municipal e aos dados públicos disponíveis no SINISA/SNIS.
            </p>

            <div className="overflow-hidden rounded-md border border-ms-line bg-ms-surface">
              <table className="w-full text-sm">
                <caption className="sr-only">Pesos das dimensões na nota geral</caption>
                <thead className="border-b border-ms-line bg-ms-surface-muted text-left">
                  <tr>
                    <th scope="col" className="t-label px-4 py-2.5 text-ms-muted">Dimensão</th>
                    <th scope="col" className="t-label px-4 py-2.5 text-right text-ms-muted">Peso</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["Água", PESOS_RANKING_SANEAMENTO.agua],
                      ["Esgoto", PESOS_RANKING_SANEAMENTO.esgoto],
                      ["Resíduos sólidos", PESOS_RANKING_SANEAMENTO.residuos],
                      ["Águas pluviais", PESOS_RANKING_SANEAMENTO.aguasPluviais],
                      ["Gestão municipal", PESOS_RANKING_SANEAMENTO.gestao]
                    ] as const
                  ).map(([tema, peso]) => {
                    const config = temaConfig(tema);
                    const Icon = config.icon;
                    return (
                      <tr key={tema} className="border-b border-ms-line last:border-b-0">
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", config.textClass)} strokeWidth={1.75} aria-hidden="true" />
                            {tema}
                          </span>
                        </td>
                        <td className="font-data px-4 py-2.5 text-right">{pct(peso)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p>
              A nota varia de 0 a 100 e reúne 16 indicadores em cinco módulos. Dentro de cada módulo, os indicadores
              disponíveis têm o mesmo peso. Percentuais são limitados ao intervalo de 0 a 100; a massa recuperada de
              resíduos é convertida em posição percentílica entre os municípios do estado; e perdas de água, domicílios
              sujeitos a inundação e população impactada por eventos hidrológicos têm sentido invertido, pois valores
              menores representam melhor desempenho.
            </p>
            <p>
              Indicadores ausentes não são estimados e recebem contribuição zero, mantendo o peso originalmente reservado a
              eles. A tela informa a cobertura de dados de cada município. Em caso de empate na nota, prevalece a maior
              cobertura e, depois, a ordem alfabética.
            </p>
            <p className="text-sm text-ms-muted">
              Referências:{" "}
              <a href="https://pnqs.com.br/" target="_blank" rel="noopener noreferrer" className="font-semibold text-ms-blue hover:underline">
                PNQS
              </a>
              ,{" "}
              <a
                href="https://pnqs.com.br/wp-content/uploads/2026/02/GRMD-2026-v1.0.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-ms-blue hover:underline"
              >
                GRMD 2026
              </a>{" "}
              e{" "}
              <a
                href="https://pnqs.com.br/wp-content/uploads/2026/02/Regulamento-PNQS-2026-v1.2.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-ms-blue hover:underline"
              >
                Regulamento PNQS 2026
              </a>
              .
            </p>
          </section>

          <section id="sentido" aria-labelledby="sentido-titulo" className="grid gap-4">
            <h2 id="sentido-titulo" className="t-h2 text-ms-ink">
              Sentido dos indicadores
            </h2>
            <p className="text-base leading-[26px] text-ms-ink">
              Cada indicador informa se valores maiores ou menores representam melhor desempenho. Esse sentido define a
              cor da variação entre anos (melhora ou piora) e a ordem do ranking por indicador.
            </p>
            {!indicadoresResult.disponivel ? <AvisoIndisponivel /> : null}
            {temas.map(([tema, lista]) => {
              const config = temaConfig(tema);
              const Icon = config.icon;
              return (
                <div key={tema} className="overflow-hidden rounded-md border border-ms-line bg-ms-surface">
                  <table className="w-full text-sm">
                    <caption className="border-b border-ms-line bg-ms-surface-muted px-4 py-2 text-left">
                      <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ms-ink">
                        <Icon className={cn("h-4 w-4", config.textClass)} strokeWidth={1.75} aria-hidden="true" />
                        {tema}
                      </span>
                    </caption>
                    <thead className="sr-only">
                      <tr>
                        <th scope="col">Indicador</th>
                        <th scope="col">Unidade</th>
                        <th scope="col">Sentido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...lista]
                        .sort((a, b) => ordenarTexto(a.nome, b.nome))
                        .map((indicador) => (
                          <tr key={indicador.codigo} className="border-b border-ms-line last:border-b-0">
                            <td className="px-4 py-2.5 text-ms-ink">{indicador.nome}</td>
                            <td className="px-4 py-2.5 text-ms-muted">{indicador.unidade ?? "—"}</td>
                            <td className="px-4 py-2.5 text-right">
                              <Badge variante={indicador.sentido === "menor_melhor" ? "inverse" : "neutral"}>
                                {ROTULO_SENTIDO[indicador.sentido]}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </section>

          <section id="fontes" aria-labelledby="fontes-titulo" className="grid gap-4 text-base leading-[26px] text-ms-ink">
            <h2 id="fontes-titulo" className="t-h2">
              Fontes de dados
            </h2>
            <p>
              O projeto usa dados de fontes oficiais ou institucionais. As fontes previstas para o Observatório de
              Saneamento são:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>SINISA;</li>
              <li>SNIS Série Histórica;</li>
              <li>IBGE;</li>
              <li>dados municipais obtidos por cooperação institucional;</li>
              <li>dados estaduais públicos.</li>
            </ul>
            <p>
              Os arquivos são baixados manualmente nos canais oficiais, sem tentativa de contornar login, CAPTCHA, CORS,
              erro 403 ou endpoints internos.
            </p>
          </section>

          <section id="rastreabilidade" aria-labelledby="rastreabilidade-titulo" className="grid gap-4 text-base leading-[26px] text-ms-ink">
            <h2 id="rastreabilidade-titulo" className="t-h2">
              Padronização e rastreabilidade
            </h2>
            <p>
              A chave principal para cruzamento é sempre o código IBGE do município. Nomes de municípios podem variar entre
              bases, então eles são usados apenas como apoio para conferência.
            </p>
            <p>
              Dado bruto é o arquivo original recebido ou baixado de uma fonte oficial. Indicador tratado é a informação
              padronizada para consulta, com município, ano, fonte, código do indicador e valor.
            </p>
            <p>
              Cada importação registra fonte, ano de referência, nome do arquivo, data de importação, total de linhas,
              linhas importadas, erros e avisos. Esse registro ajuda a revisar divergências e atualizar os dados quando a
              fonte publicar uma nova versão.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
