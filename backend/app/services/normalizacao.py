import re
import unicodedata

import pandas as pd


COLUNAS_CODIGO_IBGE = {
    "codigo_ibge",
    "cod_ibge",
    "cod_municipio",
    "codigo_municipio",
    "id_municipio",
    "municipio_codigo",
    "co_municipio",
    "codmun",
    "cod_mun",
}
COLUNAS_MUNICIPIO = {"municipio", "nome", "nome_municipio", "nm_municipio", "nome_do_municipio", "localidade", "cidade"}
COLUNAS_UF = {"uf", "sigla_uf", "estado"}
COLUNAS_ANO = {"ano", "ano_referencia", "referencia", "ano_ref"}


def remover_acentos(valor: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(valor))
    return normalized.encode("ascii", "ignore").decode("ascii")


def normalizar_nome_coluna(coluna: str) -> str:
    sem_acentos = remover_acentos(coluna).lower().strip()
    sem_simbolos = re.sub(r"[^a-z0-9]+", "_", sem_acentos)
    return re.sub(r"_+", "_", sem_simbolos).strip("_")


def codigo_indicador(coluna: str) -> str:
    return normalizar_nome_coluna(coluna)[:120]


def nome_legivel(coluna: str) -> str:
    texto = remover_acentos(str(coluna)).replace("_", " ").strip()
    return re.sub(r"\s+", " ", texto).capitalize()


def normalizar_dataframe(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, str]]:
    mapa_original = {normalizar_nome_coluna(coluna): str(coluna) for coluna in df.columns}
    df_normalizado = df.copy()
    df_normalizado.columns = [normalizar_nome_coluna(coluna) for coluna in df.columns]
    return df_normalizado, mapa_original


def detectar_coluna(df: pd.DataFrame, candidatos: set[str]) -> str | None:
    for coluna in df.columns:
        if coluna in candidatos:
            return coluna
    for coluna in df.columns:
        if any(candidato in coluna for candidato in candidatos):
            return coluna
    return None


def detectar_colunas_base(df: pd.DataFrame) -> dict[str, str | None]:
    return {
        "codigo_ibge": detectar_coluna(df, COLUNAS_CODIGO_IBGE),
        "municipio": detectar_coluna(df, COLUNAS_MUNICIPIO),
        "uf": detectar_coluna(df, COLUNAS_UF),
        "ano": detectar_coluna(df, COLUNAS_ANO),
    }


def detectar_colunas_indicadores(df: pd.DataFrame, colunas_base: dict[str, str | None]) -> list[str]:
    ignoradas = {coluna for coluna in colunas_base.values() if coluna}
    ignoradas.update({"nome", "cidade", "regiao", "estado", "uf_nome", "nome_uf", "sigla", "ibge"})

    indicadores: list[str] = []
    for coluna in df.columns:
        if coluna in ignoradas:
            continue
        serie = df[coluna].dropna()
        if serie.empty:
            continue
        # Mantem textos simples para indicadores booleanos/categoricos da primeira etapa.
        if serie.astype(str).str.len().median() <= 80:
            indicadores.append(coluna)
    return indicadores


def normalizar_codigo_ibge(valor: object) -> str | None:
    if pd.isna(valor):
        return None
    apenas_digitos = re.sub(r"\D", "", str(valor))
    if len(apenas_digitos) == 6:
        apenas_digitos = f"0{apenas_digitos}"
    if len(apenas_digitos) != 7:
        return None
    return apenas_digitos


def normalizar_nome_municipio(valor: object) -> str:
    return normalizar_nome_coluna(str(valor))
