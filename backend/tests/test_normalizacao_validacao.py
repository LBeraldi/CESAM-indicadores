import math

import pandas as pd
import pytest

from app.services.normalizacao import (
    detectar_colunas_base,
    detectar_colunas_indicadores,
    nome_legivel,
    normalizar_codigo_ibge,
    normalizar_dataframe,
    normalizar_nome_coluna,
)
from app.services.validacao import converter_ano, converter_valor


def test_normaliza_colunas_e_detecta_campos_base() -> None:
    original = pd.DataFrame(
        {
            "Código IBGE": [5003702],
            "Município": ["Dourados"],
            "UF": ["MS"],
            "Ano Referência": [2023],
            "Índice de coleta (%)": [98.5],
        }
    )
    normalizado, mapa = normalizar_dataframe(original)
    base = detectar_colunas_base(normalizado)

    assert list(normalizado.columns) == [
        "codigo_ibge",
        "municipio",
        "uf",
        "ano_referencia",
        "indice_de_coleta",
    ]
    assert mapa["codigo_ibge"] == "Código IBGE"
    assert base == {
        "codigo_ibge": "codigo_ibge",
        "municipio": "municipio",
        "uf": "uf",
        "ano": "ano_referencia",
    }
    assert detectar_colunas_indicadores(normalizado, base) == ["indice_de_coleta"]


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        (" Águas  Pluviais (%) ", "aguas_pluviais"),
        ("Município", "municipio"),
        ("rede--total", "rede_total"),
    ],
)
def test_normaliza_nome_coluna(entrada: str, esperado: str) -> None:
    assert normalizar_nome_coluna(entrada) == esperado


def test_normaliza_codigo_ibge_e_nome_legivel() -> None:
    assert normalizar_codigo_ibge("5003702.0") == "5003702"
    assert normalizar_codigo_ibge(5003702) == "5003702"
    assert normalizar_codigo_ibge(None) is None
    assert normalizar_codigo_ibge("123") is None
    assert nome_legivel("indice_de_coleta") == "Indice de coleta"


@pytest.mark.parametrize(
    ("entrada", "esperado", "erro"),
    [
        ("1.234,56 %", 1234.56, None),
        ("98,5", 98.5, None),
        ("sim", 1.0, None),
        ("não", 0.0, None),
        (True, 1.0, None),
        ("", None, "valor ausente"),
        ("sem dado", None, "valor invalido"),
        (math.inf, None, "valor invalido"),
    ],
)
def test_converte_valores_oficiais(entrada: object, esperado: float | None, erro: str | None) -> None:
    assert converter_valor(entrada) == (esperado, erro)


def test_converte_ano_com_fallback() -> None:
    assert converter_ano("2023/2024", None) == 2023
    assert converter_ano(pd.NA, 2022) == 2022
    assert converter_ano("1899", 2020) == 2020
