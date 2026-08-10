export type DocumentoGestao = {
  conselhoUrl?: string;
  planoUrl?: string;
};

const DOCUMENTOS_POR_IBGE: Record<string, DocumentoGestao> = {
  "5003702": {
    conselhoUrl:
      "https://www.camaradourados.ms.gov.br/portal/noticias/0/3/7774/camara-de-dourados-aprova-mudancas-na-reurb-e-vincula-conselho-de-saneamento-a-semsur/",
    planoUrl: "https://do.dourados.ms.gov.br/wp-content/uploads/2019/01/ANEXO-1.pdf"
  }
};

function slugMunicipio(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getRecursosGestaoMunicipal(codigoIbge: string, municipio: string) {
  const cadastrado = DOCUMENTOS_POR_IBGE[codigoIbge];

  return {
    conselho: {
      url:
        cadastrado?.conselhoUrl ??
        `https://www.aguaesaneamento.org.br/municipios-e-saneamento/ms/${slugMunicipio(municipio)}`,
      direto: Boolean(cadastrado?.conselhoUrl)
    },
    plano: {
      url:
        cadastrado?.planoUrl ??
        `https://www.google.com/search?q=${encodeURIComponent(`site:*.ms.gov.br "Plano Municipal de Saneamento Básico" "${municipio}" filetype:pdf`)}`,
      direto: Boolean(cadastrado?.planoUrl)
    }
  };
}
