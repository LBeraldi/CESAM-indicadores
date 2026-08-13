function slugMunicipio(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Links de descoberta usados somente quando ainda não há documento oficial cadastrado na API. */
export function getRecursosGestaoMunicipal(_codigoIbge: string, municipio: string) {
  return {
    conselho: {
      url: `https://www.aguaesaneamento.org.br/municipios-e-saneamento/ms/${slugMunicipio(municipio)}`,
      direto: false,
    },
    plano: {
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:*.ms.gov.br "Plano Municipal de Saneamento Básico" "${municipio}" filetype:pdf`)}`,
      direto: false,
    },
  };
}
