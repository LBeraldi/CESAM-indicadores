from __future__ import annotations

from dataclasses import dataclass
import gzip
import json
from urllib.parse import quote
from urllib.request import Request, urlopen


IBGE_AGREGADOS_URL = "https://servicodados.ibge.gov.br/api/v3/agregados"
TIMEOUT_SECONDS = 8

# O agregado 1301 devolve "..." para Paraíso das Águas, embora o portal
# Cidades@ publique a área territorial oficial. Mantemos a exceção explícita
# até o agregado passar a fornecer esse município.
AREAS_IBGE_COMPLEMENTARES = {
    "5006275": 5061.433,
}


@dataclass(frozen=True)
class MetadadosMunicipioIbge:
    populacao: int | None = None
    area_km2: float | None = None


def _get_json(url: str) -> object:
    request = Request(url, headers={"User-Agent": "observatorio-saneamento/0.1"})
    with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        content = response.read()
        if response.headers.get("Content-Encoding") == "gzip" or content.startswith(b"\x1f\x8b"):
            content = gzip.decompress(content)
        return json.loads(content.decode("utf-8"))


def _parse_float(value: object) -> float | None:
    if value is None:
        return None

    text = str(value).strip().replace("\xa0", "")
    if not text or text in {"-", "...", "X"}:
        return None

    if "," in text and "." not in text:
        text = text.replace(",", ".")

    try:
        return float(text)
    except ValueError:
        return None


def _extrair_primeiro_valor(payload: object) -> float | None:
    if not isinstance(payload, list) or not payload:
        return None

    resultados = payload[0].get("resultados") if isinstance(payload[0], dict) else None
    if not isinstance(resultados, list) or not resultados:
        return None

    series = resultados[0].get("series") if isinstance(resultados[0], dict) else None
    if not isinstance(series, list) or not series:
        return None

    serie = series[0].get("serie") if isinstance(series[0], dict) else None
    if not isinstance(serie, dict) or not serie:
        return None

    periodo = sorted(serie.keys())[-1]
    return _parse_float(serie.get(periodo))


def _url_agregado(agregado: str, variavel: str, codigo_ibge: str) -> str:
    localidade = quote(f"N6[{codigo_ibge}]", safe="[]")
    return f"{IBGE_AGREGADOS_URL}/{agregado}/periodos/-1/variaveis/{variavel}?localidades={localidade}"


def _extrair_valores_por_municipio(payload: object) -> dict[str, float]:
    if not isinstance(payload, list) or not payload:
        return {}

    item = payload[0] if isinstance(payload[0], dict) else {}
    resultados = item.get("resultados")
    if not isinstance(resultados, list) or not resultados:
        return {}

    resultado = resultados[0] if isinstance(resultados[0], dict) else {}
    series = resultado.get("series")
    if not isinstance(series, list):
        return {}

    valores: dict[str, float] = {}
    for item_serie in series:
        if not isinstance(item_serie, dict):
            continue
        localidade = item_serie.get("localidade")
        serie = item_serie.get("serie")
        if not isinstance(localidade, dict) or not isinstance(serie, dict) or not serie:
            continue

        codigo_ibge = str(localidade.get("id", "")).strip()
        periodo = sorted(serie.keys())[-1]
        valor = _parse_float(serie.get(periodo))
        if codigo_ibge and valor is not None:
            valores[codigo_ibge] = valor

    return valores


def _url_agregado_municipios_ms(agregado: str, variavel: str) -> str:
    # N3[50] representa Mato Grosso do Sul; N6 seleciona seus municípios.
    localidade = quote("N6[N3[50]]", safe="[]")
    return f"{IBGE_AGREGADOS_URL}/{agregado}/periodos/-1/variaveis/{variavel}?localidades={localidade}"


def buscar_metadados_municipios_ms() -> dict[str, MetadadosMunicipioIbge]:
    populacao_payload = _get_json(_url_agregado_municipios_ms("6579", "9324"))
    area_payload = _get_json(_url_agregado_municipios_ms("1301", "615"))

    populacoes = _extrair_valores_por_municipio(populacao_payload)
    areas = _extrair_valores_por_municipio(area_payload)
    areas.update(AREAS_IBGE_COMPLEMENTARES)
    codigos = populacoes.keys() | areas.keys()

    return {
        codigo: MetadadosMunicipioIbge(
            populacao=int(round(populacoes[codigo])) if codigo in populacoes else None,
            area_km2=areas.get(codigo),
        )
        for codigo in codigos
    }


def buscar_metadados_municipio(codigo_ibge: str) -> MetadadosMunicipioIbge:
    populacao_payload = _get_json(_url_agregado("6579", "9324", codigo_ibge))
    area_payload = _get_json(_url_agregado("1301", "615", codigo_ibge))

    populacao = _extrair_primeiro_valor(populacao_payload)
    area_km2 = _extrair_primeiro_valor(area_payload) or AREAS_IBGE_COMPLEMENTARES.get(codigo_ibge)

    return MetadadosMunicipioIbge(
        populacao=int(round(populacao)) if populacao is not None else None,
        area_km2=area_km2,
    )
