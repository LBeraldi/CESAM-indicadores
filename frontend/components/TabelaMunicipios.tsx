"use client";

import { ArrowRight, ArrowUpDown, Building2, CheckCircle2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Municipio } from "@/lib/api";

type Props = {
  municipios: Municipio[];
  codigosComDados: Set<string>;
};

type Coluna = "nome" | "populacao" | "area_km2";
type Direcao = "asc" | "desc";

const COLUNAS: { chave: Coluna; rotulo: string }[] = [
  { chave: "nome", rotulo: "Município" },
  { chave: "populacao", rotulo: "População" },
  { chave: "area_km2", rotulo: "Área (km²)" }
];

export function TabelaMunicipios({ municipios, codigosComDados }: Props) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [ordenarPor, setOrdenarPor] = useState<Coluna>("nome");
  const [direcao, setDirecao] = useState<Direcao>("asc");

  function alternarOrdenacao(coluna: Coluna) {
    if (coluna === ordenarPor) {
      setDirecao((atual) => (atual === "asc" ? "desc" : "asc"));
      return;
    }
    setOrdenarPor(coluna);
    setDirecao(coluna === "nome" ? "asc" : "desc");
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const lista = termo
      ? municipios.filter((municipio) => municipio.nome.toLocaleLowerCase("pt-BR").includes(termo))
      : municipios;

    const sinal = direcao === "asc" ? 1 : -1;

    return [...lista].sort((a, b) => {
      if (ordenarPor === "nome") {
        return sinal * a.nome.localeCompare(b.nome, "pt-BR");
      }

      const valorA = a[ordenarPor] ?? -1;
      const valorB = b[ordenarPor] ?? -1;
      return sinal * (valorA - valorB);
    });
  }, [busca, municipios, ordenarPor, direcao]);

  return (
    <section className="space-y-5">
      <div className="rounded-md border border-ms-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ms-green">Consulta municipal</p>
            <h1 className="mt-1 text-3xl font-semibold text-ms-ink">Municípios de Mato Grosso do Sul</h1>
            <p className="mt-2 text-sm text-ms-muted">
              {filtrados.length} de {municipios.length} municípios listados
            </p>
          </div>

          <label className="relative block w-full lg:w-96">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ms-muted" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar município"
              className="h-11 w-full rounded-md border border-ms-line bg-ms-bg pl-9 pr-3 text-base outline-none ring-ms-blue/20 focus:border-ms-blue focus:bg-white focus:ring-4 md:text-sm"
            />
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-ms-line bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ms-line text-sm">
            <thead className="bg-ms-bg text-left text-xs font-semibold uppercase tracking-wide text-ms-muted">
              <tr>
                {COLUNAS.map((coluna) => (
                  <th key={coluna.chave} className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => alternarOrdenacao(coluna.chave)}
                      className="inline-flex items-center gap-1 hover:text-ms-blue"
                    >
                      {coluna.rotulo}
                      <ArrowUpDown className={`h-3.5 w-3.5 ${ordenarPor === coluna.chave ? "text-ms-blue" : "opacity-40"}`} />
                    </button>
                  </th>
                ))}
                <th className="px-5 py-4">Dados</th>
                <th className="px-5 py-4 text-right">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ms-line">
              {filtrados.map((municipio) => {
                const temDados = codigosComDados.has(municipio.codigo_ibge);

                return (
                  <tr
                    key={municipio.codigo_ibge}
                    onClick={() => router.push(`/municipios/${municipio.codigo_ibge}`)}
                    className="cursor-pointer hover:bg-ms-sky/50"
                  >
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ms-sky text-ms-blue">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <span className="font-semibold text-ms-ink">{municipio.nome}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-ms-muted">
                      {municipio.populacao ? municipio.populacao.toLocaleString("pt-BR") : "Não informada"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-ms-muted">
                      {municipio.area_km2 ? municipio.area_km2.toLocaleString("pt-BR") : "Não informada"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      {temDados ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e5f3ec] px-2.5 py-1 text-xs font-medium text-[#125f48]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Saneamento carregado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-ms-bg px-2.5 py-1 text-xs font-medium text-ms-muted">
                          Sem dado de saneamento
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <Link
                        href={`/municipios/${municipio.codigo_ibge}`}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-ms-line bg-white px-3 font-medium text-ms-ink hover:border-ms-blue hover:text-ms-blue"
                      >
                        Abrir
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
