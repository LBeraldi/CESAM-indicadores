"""Leitura do catálogo institucional versionado junto com a aplicação.

O banco continua sendo a fonte principal. Este catálogo permite que a API
apresente os prestadores municipais durante uma primeira implantação ou
enquanto a tabela institucional ainda não foi populada.
"""

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

CATALOGO_PATH = Path(__file__).resolve().parents[1] / "data" / "cadastros_institucionais.json"


@lru_cache(maxsize=1)
def _carregar_catalogo() -> dict[str, Any]:
    try:
        return json.loads(CATALOGO_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"atendimentos": [], "documentos": []}


def obter_cadastro_estatico(codigo_ibge: str) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    """Retorna o cadastro institucional normalizado para a resposta da API."""
    catalogo = _carregar_catalogo()
    item = next((item for item in catalogo.get("atendimentos", []) if item.get("codigo_ibge") == codigo_ibge), None)

    atendimento: dict[str, Any] | None = None
    if item:
        prestador = item.get("prestador", {})
        dados_atendimento = item.get("atendimento", {})
        atendimento = {
            "prestador_nome": prestador.get("nome", "Prestador municipal de saneamento"),
            "sigla": prestador.get("sigla"),
            "natureza_juridica": prestador.get("natureza_juridica"),
            "area_atuacao": prestador.get("area_atuacao"),
            "forma_prestacao": prestador.get("forma_prestacao"),
            "instrumento_delegacao": prestador.get("instrumento_delegacao"),
            "fonte": prestador.get("fonte", "Catálogo institucional do Observatório"),
            "ano_referencia": prestador.get("ano_referencia", 2023),
            "endereco": dados_atendimento.get("endereco"),
            "site_url": dados_atendimento.get("siteUrl", "https://www.google.com/"),
            "site_label": dados_atendimento.get("siteLabel", "Página institucional"),
            "maps_url": dados_atendimento.get("mapsUrl", "https://www.google.com/maps"),
            "fonte_endereco": dados_atendimento.get("fonteEndereco"),
        }

    recursos = [
        {
            "tipo": documento.get("tipo", "recurso_municipal"),
            "url": documento.get("url", ""),
            "direto": bool(documento.get("direto", False)),
            "fonte": documento.get("fonte"),
        }
        for documento in catalogo.get("documentos", [])
        if documento.get("codigo_ibge") == codigo_ibge and documento.get("url")
    ]
    return atendimento, recursos
