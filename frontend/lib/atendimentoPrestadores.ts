import type { PrestadorAgua } from "@/lib/prestadoresAgua";

export type AtendimentoPrestador = {
  endereco: string | null;
  siteUrl: string;
  siteLabel: string;
  mapsUrl: string;
  fonteEndereco: string | null;
};

const SITE_SANESUL = "https://www.sanesul.ms.gov.br/";
const FONTE_ENDERECOS_SANESUL = "https://www.sanesul.ms.gov.br/Content/upload/telefones.pdf";

const ENDERECOS_SANESUL: Record<string, string> = {
  "Água Clara": "Rua Nove de Julho, 14, Jardim Paulista",
  "Alcinópolis": "Avenida Darlindo José Carneiro, 919, Centro",
  "Amambai": "Rua José Luiz Sampaio, 1891, Vila Vilarinho",
  "Anastácio": "Rua João Leite Ribeiro, s/n, Vila Flor",
  "Anaurilândia": "Rua Floriano Peixoto, 1179, Centro",
  "Angélica": "Rua Antônio Basílio de Lima, 325, Centro",
  "Antônio João": "Rua Juraci Pereira, 144, Centro",
  "Aparecida do Taboado": "Rua Orlando Mascarenhas, 2060, Centro",
  "Aquidauana": "Rua Pândia Calógeras, 372, Centro",
  "Aral Moreira": "Rua Dom Pedro II, 474, Centro",
  "Bataguassu": "Rua José Vicente Vitiriti, 87, Centro",
  "Batayporã": "Rua Elpídio Lucas Arantes, 1025, Centro",
  "Bodoquena": "Rua Sebastião Raimundo de Barros, s/n, Centro",
  "Bonito": "Rua Coronel Pilad Rebuá, 1009, Vila Donária",
  "Brasilândia": "Avenida José Estevan da Silva, 1000, Centro",
  "Caarapó": "Rua Presidente Vargas, 551, Centro",
  "Camapuã": "Rua Cândido Mariano, 639, Centro",
  "Caracol": "Rua João Loureiro, 871, Centro",
  "Chapadão do Sul": "Rua Dez, 816, Centro",
  "Coronel Sapucaia": "Avenida Flávio Derzi, 1837, Centro",
  "Corumbá": "Rua Cabral, 1018, Centro",
  "Coxim": "Rua Antônio de Albuquerque, 531, Centro",
  "Deodápolis": "Rua Padre Amadeu Amadori, 915, Centro",
  "Dois Irmãos do Buriti": "Avenida Reginaldo Lemes da Silva, 91, Centro",
  "Douradina": "Rua Áurea Barbosa Serqueira, 57, Centro",
  "Dourados": "Rua Onofre Pereira de Matos, 1330, Centro",
  "Eldorado": "Rua Venceslau Onório da Silva, 405, Centro",
  "Fátima do Sul": "Rua Ataulfo de Matos, 1349, Centro",
  "Figueirão": "Rua Castro Alves, s/n, Centro",
  "Guia Lopes da Laguna": "Rua Juscelino Kubitschek, 2034, Vila São Miguel",
  "Iguatemi": "Avenida Presidente Vargas, 1726, Centro",
  "Inocência": "Rua Albertina Garcia Dias, 599, Centro",
  "Itaporã": "Rua Antônio João Ribeiro, 575, Centro",
  "Itaquiraí": "Avenida Dourados, 1441, Centro",
  "Ivinhema": "Avenida Yolanda M. Mauger, 497, Centro",
  "Japorã": "Rua Aquidauana, 188, Centro",
  "Jardim": "Avenida 11 de Dezembro, 1280, Vila Angélica II",
  "Jateí": "Rua Miguel Lopes Falheiros, 321, Centro",
  "Juti": "Rua Duque de Caxias, s/n, Centro",
  "Ladário": "Rua Comandante Souza Lobo, 479, Centro",
  "Laguna Carapã": "Rua Manoel Ribeiro da Rocha, s/n, Centro",
  "Maracaju": "Avenida Santa Maria, 360, Centro",
  "Miranda": "Rua Benjamim Constant, 741, Centro",
  "Mundo Novo": "Avenida Campo Grande, 1096, Centro",
  "Naviraí": "Praça Prefeito Euclides Antônio Fabris, 211, Centro",
  "Nioaque": "Rua Princesa Isabel, 913, Jardim Ouro Verde",
  "Nova Alvorada do Sul": "Avenida Irineu de Souza Araújo, 983, Jardim Eldorado",
  "Nova Andradina": "Rua São José, 25, Centro",
  "Novo Horizonte do Sul": "Rua José Yamashita, s/n, Centro",
  "Paranaíba": "Rua Autogamis Rodrigues da Silva, 835, Centro",
  "Paranhos": "Rua Airton Senna da Silva, 2064, Centro",
  "Pedro Gomes": "Rua Pernambuco, 561, Centro",
  "Ponta Porã": "Rua General Osório, 32, Centro",
  "Porto Murtinho": "Rua Dr. Corrêa, 230, Centro",
  "Ribas do Rio Pardo": "Rua Argeu Silveira Lima, 1775, Santos Dumont",
  "Rio Brilhante": "Rua Sidney Coelho Nogueira, 1285, Centro",
  "Rio Negro": "Rua Cantareira, 270, Centro",
  "Rio Verde de Mato Grosso": "Rua Marechal Mascarenhas, 100, Centro",
  "Santa Rita do Pardo": "Rua João Ferreira da Silva, 1715, Centro",
  "Selvíria": "Rua João Selvírio de Souza, 1527, Centro",
  "Sete Quedas": "Rua Érico Veríssimo, 1296, Centro",
  "Sidrolândia": "Avenida Dorvalino dos Santos, 11, Centro",
  "Sonora": "Rua do Governo, 536, Centro",
  "Tacuru": "Rua Antônio Tomás de Paiva, 561, Centro",
  "Taquarussu": "Avenida Felinto Müller, 1658, Centro",
  "Terenos": "Rua Dom Aquino, 260, Centro",
  "Três Lagoas": "Avenida Antônio Trajano dos Santos, 511, Centro",
  "Vicentina": "Rua Rainha dos Apóstolos, 975, Centro"
};

const ATENDIMENTOS_LOCAIS: Record<string, Omit<AtendimentoPrestador, "mapsUrl">> = {
  "5001508": {
    endereco: "Rua Tiradentes, 2005, Centro",
    siteUrl: "https://www.saaebandeirantes.ms.gov.br/",
    siteLabel: "Site do SAAE de Bandeirantes",
    fonteEndereco: "https://bandeirantes.ms.gov.br/v2/saae/"
  },
  "5002100": {
    endereco: "Rua Peri de Almeida Melo, 571, Centro",
    siteUrl: "https://saaebelavista.ms.gov.br/",
    siteLabel: "Site do SAAE de Bela Vista",
    fonteEndereco: "https://saaebelavista.ms.gov.br/contato"
  },
  "5002704": {
    endereco: "Rua Marechal Cândido Mariano Rondon, 1808, Centro",
    siteUrl: "https://www.aguasguariroba.com.br/",
    siteLabel: "Site da Águas Guariroba",
    fonteEndereco: "https://www.aguasguariroba.com.br/contato/"
  },
  "5002902": {
    endereco: null,
    siteUrl: "https://www.cassilandia.ms.gov.br/",
    siteLabel: "Site da Prefeitura de Cassilândia",
    fonteEndereco: null
  },
  "5003108": {
    endereco: "Rua Barão do Rio Branco, 176, Centro",
    siteUrl: "https://corguinho.ms.gov.br/carta-de-servicos/estrutura-organizacional",
    siteLabel: "Página do SAAE de Corguinho",
    fonteEndereco: "https://corguinho.ms.gov.br/carta-de-servicos/estrutura-organizacional"
  },
  "5003256": {
    endereco: "Rua José Narciso Totó, 414, Centro",
    siteUrl: "https://www.costarica.ms.gov.br/",
    siteLabel: "Site da Prefeitura de Costa Rica",
    fonteEndereco: "https://www.costarica.ms.gov.br/portal/noticias/0/3/4424/exservidora-vera-alice-garcia-da-nome-ao-atual-predio-sede-do-saae-de-costa-rica"
  },
  "5004007": {
    endereco: null,
    siteUrl: "https://www.gloriadedourados.ms.gov.br/",
    siteLabel: "Site da Prefeitura de Glória de Dourados",
    fonteEndereco: null
  },
  "5004908": {
    endereco: null,
    siteUrl: "https://www.jaraguari.ms.gov.br/",
    siteLabel: "Site da Prefeitura de Jaraguari",
    fonteEndereco: null
  },
  "5006275": {
    endereco: null,
    siteUrl: "https://www.paraisodasaguas.ms.gov.br/",
    siteLabel: "Site da Prefeitura de Paraíso das Águas",
    fonteEndereco: null
  },
  "5007505": {
    endereco: null,
    siteUrl: "https://www.rochedo.ms.gov.br/",
    siteLabel: "Site da Prefeitura de Rochedo",
    fonteEndereco: null
  },
  "5007695": {
    endereco: "Rua Minas Gerais, 855, Centro",
    siteUrl: "https://www.saogabriel.ms.gov.br/secretaria/inicio/saae/8",
    siteLabel: "Página do SAAE de São Gabriel do Oeste",
    fonteEndereco: "https://www.saogabriel.ms.gov.br/secretaria/inicio/saae/8"
  }
};

export function getAtendimentoPrestador(
  codigoIbge: string,
  municipio: string,
  prestador: PrestadorAgua | null
): AtendimentoPrestador | null {
  if (!prestador) return null;

  const local = ATENDIMENTOS_LOCAIS[codigoIbge];
  const enderecoSanesul = prestador.sigla === "SANESUL" ? ENDERECOS_SANESUL[municipio] ?? null : null;
  const base = local ?? {
    endereco: enderecoSanesul,
    siteUrl: SITE_SANESUL,
    siteLabel: "Site da Sanesul",
    fonteEndereco: enderecoSanesul ? FONTE_ENDERECOS_SANESUL : null
  };
  const buscaMaps = base.endereco
    ? `${base.endereco}, ${municipio}, MS`
    : `${prestador.nome}, ${municipio}, MS`;

  return {
    ...base,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(buscaMaps)}`
  };
}
