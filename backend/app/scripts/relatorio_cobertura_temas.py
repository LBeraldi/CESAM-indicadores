"""Relatorio de cobertura tematica de saneamento por municipio.

Consulta a API publica (GET /municipios e GET /municipios/{codigo}/indicadores)
e monta uma matriz Sim/Nao: para cada municipio de MS, quais temas (Agua,
Esgoto, Residuos solidos, Aguas pluviais, Gestao municipal) tem pelo menos um
indicador com valor oficial no ano informado.

Uso:
    python -m app.scripts.relatorio_cobertura_temas
    python -m app.scripts.relatorio_cobertura_temas --api-url https://observatorio-saneamento-api.vercel.app
    python -m app.scripts.relatorio_cobertura_temas --fonte oficial_snis --ano 2022 --saida cobertura.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.error import URLError

ORDEM_TEMAS = ["Água", "Esgoto", "Resíduos sólidos", "Águas pluviais", "Gestão municipal"]


def _get_json(url: str) -> object:
    with urllib.request.urlopen(url, timeout=20) as resposta:
        return json.loads(resposta.read())


def _cobertura_municipio(api_url: str, codigo_ibge: str, ano: int, fonte: str) -> dict[str, bool]:
    dados = _get_json(f"{api_url}/municipios/{codigo_ibge}/indicadores?ano={ano}")
    cobertura = {tema: False for tema in ORDEM_TEMAS}
    for valor in dados["indicadores"]:
        tema = valor["indicador"]["tema"]
        tem_valor_oficial = valor["valor"] is not None and (fonte == "qualquer" or valor["status_validacao"] == fonte)
        if tem_valor_oficial and tema in cobertura:
            cobertura[tema] = True
    return cobertura


def gerar_relatorio(api_url: str, ano: int, fonte: str, workers: int) -> list[dict]:
    municipios = _get_json(f"{api_url}/municipios")

    def linha(municipio: dict) -> dict:
        cobertura = _cobertura_municipio(api_url, municipio["codigo_ibge"], ano, fonte)
        return {
            "codigo_ibge": municipio["codigo_ibge"],
            "municipio": municipio["nome"],
            **{tema: "Sim" if presente else "Não" for tema, presente in cobertura.items()},
        }

    with ThreadPoolExecutor(max_workers=workers) as pool:
        linhas = list(pool.map(linha, municipios))

    linhas.sort(key=lambda item: item["municipio"])
    return linhas


def imprimir_tabela(linhas: list[dict]) -> None:
    largura_nome = max(len(item["municipio"]) for item in linhas)
    cabecalho = "Município".ljust(largura_nome) + "".join(f" | {tema}" for tema in ORDEM_TEMAS)
    print(cabecalho)
    print("-" * len(cabecalho))
    for item in linhas:
        colunas = "".join(f" | {item[tema]:<{len(tema)}}" for tema in ORDEM_TEMAS)
        print(item["municipio"].ljust(largura_nome) + colunas)

    print()
    total = len(linhas)
    for tema in ORDEM_TEMAS:
        cobertos = sum(1 for item in linhas if item[tema] == "Sim")
        print(f"{tema}: {cobertos}/{total} municípios com dado oficial")


def salvar_csv(linhas: list[dict], caminho: str) -> None:
    campos = ["codigo_ibge", "municipio", *ORDEM_TEMAS]
    with open(caminho, "w", newline="", encoding="utf-8-sig") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=campos)
        escritor.writeheader()
        escritor.writerows(linhas)
    print(f"\nCSV salvo em {caminho}")


def main() -> None:
    # No Windows, o console usa a codepage do sistema por padrão; força UTF-8
    # para os acentos do nome dos municípios não virarem mojibake no terminal.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api-url", default=os.getenv("API_INTERNAL_URL", "http://localhost:8000"))
    parser.add_argument("--ano", type=int, default=2023)
    parser.add_argument(
        "--fonte",
        default="oficial_sinisa",
        choices=["oficial_sinisa", "oficial_snis", "qualquer"],
        help="Filtra por status_validacao. 'qualquer' aceita qualquer valor não nulo, mesmo pendente.",
    )
    parser.add_argument("--workers", type=int, default=10)
    parser.add_argument("--saida", help="Caminho de um CSV para salvar o relatório, além de imprimir no terminal.")
    args = parser.parse_args()

    api_url = args.api_url.rstrip("/")
    try:
        linhas = gerar_relatorio(api_url, args.ano, args.fonte, args.workers)
    except URLError as erro:
        print(f"Não foi possível consultar {api_url}: {erro}", file=sys.stderr)
        raise SystemExit(1) from erro

    imprimir_tabela(linhas)
    if args.saida:
        salvar_csv(linhas, args.saida)


if __name__ == "__main__":
    main()
