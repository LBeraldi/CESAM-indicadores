const API_BASE_URL =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Usada em componentes de cliente ("use client"): API_INTERNAL_URL só é
// resolvível dentro da rede Docker do backend, nunca a partir do navegador.
export const CLIENT_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Municipio = {
  id: number;
  codigo_ibge: string;
  nome: string;
  uf: string;
  populacao: number | null;
  area_km2: number | null;
  created_at: string;
  updated_at: string;
};

export type SentidoIndicador = "maior_melhor" | "menor_melhor" | "neutro";

export type Indicador = {
  id: number;
  codigo: string;
  nome: string;
  tema: string;
  descricao: string | null;
  unidade: string | null;
  formula: string | null;
  fonte: string | null;
  sentido: SentidoIndicador;
  created_at: string;
  updated_at: string;
};

export type ValorIndicador = {
  id: number;
  ano: number;
  valor: number | null;
  status_validacao: string;
  observacoes: string | null;
  indicador: Indicador;
  fonte: string | null;
};

export type IndicadoresMunicipio = {
  municipio: Municipio;
  indicadores: ValorIndicador[];
};

export type AtendimentoAgua = {
  prestador_nome: string;
  sigla: string | null;
  natureza_juridica: string | null;
  area_atuacao: string | null;
  forma_prestacao: string | null;
  instrumento_delegacao: string | null;
  fonte: string;
  ano_referencia: number;
  endereco: string | null;
  site_url: string;
  site_label: string;
  maps_url: string;
  fonte_endereco: string | null;
};

export type RecursoMunicipal = {
  tipo: "conselho" | "plano_saneamento" | string;
  url: string;
  direto: boolean;
  fonte: string | null;
};

export type InstitucionalMunicipio = {
  atendimento_agua: AtendimentoAgua | null;
  recursos: RecursoMunicipal[];
};

export type RankingItem = {
  posicao: number;
  codigo_ibge: string;
  municipio: string;
  uf: string;
  ano: number;
  valor: number | null;
  indicador: string;
  unidade: string | null;
  fonte: string | null;
  sentido: SentidoIndicador;
};

export type RankingSaneamentoValor = Omit<RankingItem, "posicao">;

export async function fetchApi<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new Error(`Falha ao consultar ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchApiSafe<T>(path: string, fallback: T): Promise<T> {
  try {
    return await fetchApi<T>(path);
  } catch {
    return fallback;
  }
}

export type ApiResult<T> = { data: T; disponivel: boolean };

/**
 * Como fetchApiSafe, mas preserva se a chamada falhou. Use quando a tela
 * precisa distinguir "API indisponível" de "não há resultados para o filtro".
 */
export async function fetchApiResult<T>(path: string, fallback: T): Promise<ApiResult<T>> {
  try {
    return { data: await fetchApi<T>(path), disponivel: true };
  } catch {
    return { data: fallback, disponivel: false };
  }
}
