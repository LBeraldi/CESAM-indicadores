import math
import re

import pandas as pd

SIM = {"sim", "s", "yes", "y", "true", "verdadeiro", "1"}
NAO = {"nao", "não", "n", "no", "false", "falso", "0"}


def converter_ano(valor: object, ano_padrao: int | None) -> int | None:
    if pd.isna(valor):
        return ano_padrao
    texto = re.sub(r"\D", "", str(valor))
    if len(texto) >= 4:
        ano = int(texto[:4])
        if 1900 <= ano <= 2100:
            return ano
    return ano_padrao


def converter_valor(valor: object) -> tuple[float | None, str | None]:
    if pd.isna(valor) or valor == "":
        return None, "valor ausente"

    if isinstance(valor, bool):
        return (1.0 if valor else 0.0), None

    texto = str(valor).strip().lower()
    if texto in SIM:
        return 1.0, None
    if texto in NAO:
        return 0.0, None

    texto = texto.replace("%", "").replace(" ", "")
    if "," in texto and "." in texto:
        texto = texto.replace(".", "").replace(",", ".")
    else:
        texto = texto.replace(",", ".")

    try:
        numero = float(texto)
    except ValueError:
        return None, "valor invalido"

    if math.isnan(numero) or math.isinf(numero):
        return None, "valor invalido"
    return numero, None
