"""Importa as planilhas municipais do SINISA 2024 para Mato Grosso do Sul.

Os arquivos são mantidos fora do Git e podem ser apontados por
``SINISA_2024_DIR``. O importador registra uma fonte própria para 2024, sem
substituir os valores já importados do SINISA 2023.
"""

import os
import re
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile

import pandas as pd
from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal
from app.scripts.migrar import main as migrar
from app.seed import DATA_DIR, seed_all
from app.services.validacao import converter_valor

ANO_REFERENCIA = 2024
FONTE_NOME = "SINISA 2024"
FONTE_ORIGEM = "Ministério das Cidades / SINISA"
URL_RESULTADOS = (
    "https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa/resultados-sinisa"
)

REPO_ROOT = Path(__file__).resolve().parents[3]
PLANILHAS_DIR = Path(os.getenv("SINISA_2024_DIR", REPO_ROOT / "Planilhas Indicadores"))

ARQUIVOS_OBRIGATORIOS = [
    Path(
        "SINISA_Resultados_Ref2024/Água - Base Municipal/"
        "SINISA_AGUA_Indicadores_Base Municipal_2024_Retificação.xlsx"
    ),
    Path(
        "SINISA_Resultados_Ref2024/Água - Base Municipal/"
        "SINISA_AGUA_Informações_Gestão Técnica de Água_Base Municipal_2024_Retificação.xlsx"
    ),
    Path("SINISA_ESGOTO_Planilhas_2024/Esgoto - Base Municipal/SINISA_ESGOTO_Indicadores_Base Municipal_2024.xlsx"),
    Path(
        "SINISA_ESGOTO_Planilhas_2024/Esgoto - Base Municipal/"
        "SINISA_ESGOTO_Informações_Gestão Técnica de Esgoto_Base Municipal_2024.xlsx"
    ),
    Path("SINISA_RESIDUOS_planilhas_2024/SINISA_RESIDUOS_Indicadores_2024.xlsx"),
    Path("SINISA_AGUASPLUVIAIS_Informacoes_Indicadores_2025/SINISA_AGUASPLUVIAIS_Indicadores_2024.zip"),
    Path("copy_of_SINISA_GESTAO_MUNICIPAL_Informacoes_2024.xlsx"),
]

MAPEAMENTO_AGUA = [
    ("agua_atendimento_total", "IAG0001", "Atendimento da população total com rede de abastecimento de água"),
    ("agua_atendimento_urbano", "IAG0002", "Atendimento da população urbana com rede de abastecimento de água"),
    ("agua_perdas_distribuicao", "IAG2013", "Perdas totais de água na distribuição"),
    ("agua_consumo_per_capita", "IAG2006", "Consumo total médio per capita de água"),
]

MAPEAMENTO_ESGOTO = [
    ("esgoto_atendimento_total", "IES0001", "Atendimento da população total com rede coletora de esgoto"),
    ("esgoto_atendimento_urbano", "IES0002", "Atendimento da população urbana com rede coletora de esgoto"),
    ("esgoto_coleta", "IES2002", "Esgoto coletado referido à água consumida"),
    ("esgoto_tratamento", "IES2004", "Esgoto tratado referido ao esgoto coletado"),
]

MAPEAMENTO_RESIDUOS = [
    ("residuos_cobertura_coleta_domiciliar", "IRS0001"),
    ("residuos_cobertura_coleta_seletiva", "IRS0005"),
    ("residuos_massa_coletada_per_capita", "IRS1004"),
    ("residuos_massa_recuperada_per_capita", "IRS1008"),
]

MAPEAMENTO_AGUAS_PLUVIAIS = [
    ("aguas_pluviais_vias_pavimentadas", 24, "Parcela de vias públicas pavimentadas na área urbana"),
    (
        "aguas_pluviais_rede_subterranea",
        25,
        "Parcela de vias públicas com redes de águas pluviais subterrâneas na área urbana",
    ),
    (
        "aguas_pluviais_domicilios_risco_inundacao",
        33,
        "Parcela de domicílios sujeitos a risco de inundação na área urbana",
    ),
    (
        "aguas_pluviais_populacao_impactada",
        34,
        "Parcela da população impactada por eventos hidrológicos",
    ),
]

MAPEAMENTO_REDE = [
    (
        "agua_extensao_rede",
        "GTA1102",
        "Extensão da rede de distribuição de água",
    ),
    (
        "esgoto_extensao_rede",
        "GTE1001",
        "Extensão da rede pública de esgotamento sanitário",
    ),
]

MAPEAMENTO_GESTAO = {
    "gestao_plano_municipal_saneamento": "OGM3004*",
    "gestao_conselho_municipal": ("OGM3201*", "OGM3204*"),
    "gestao_agencia_reguladora": ("OGM2001*", "OGM2101*", "OGM2201*", "OGM2301*"),
}

# Os indicadores abaixo já possuem nomes próprios no CESAM. Os demais códigos
# oficiais são cadastrados automaticamente com o código SINISA, sem perder a
# identificação original da planilha.
MAPEAMENTO_SINISA_CESAM = {
    **{codigo: local for local, codigo, _descricao in MAPEAMENTO_AGUA},
    **{codigo: local for local, codigo, _descricao in MAPEAMENTO_ESGOTO},
    **{codigo: local for local, codigo in MAPEAMENTO_RESIDUOS},
    "IAP0001": "aguas_pluviais_vias_pavimentadas",
    "IAP0002": "aguas_pluviais_rede_subterranea",
    "IGR0001": "aguas_pluviais_domicilios_risco_inundacao",
    "IGR0002": "aguas_pluviais_populacao_impactada",
    "OGM3004*": "gestao_plano_municipal_saneamento",
}

# Estes campos entram no indicador composto já existente e não devem ser
# importados novamente individualmente para o mesmo registro único.
CODIGOS_GESTAO_COMPOSTOS = {
    *MAPEAMENTO_GESTAO["gestao_conselho_municipal"],
    *MAPEAMENTO_GESTAO["gestao_agencia_reguladora"],
}


def _normalizar_codigo(valor: object) -> str:
    texto = str(valor).strip().split(".")[0]
    return texto.zfill(7)


def _obter_municipios(db: Session) -> dict[str, models.Municipio]:
    municipios = db.scalars(select(models.Municipio).where(models.Municipio.uf == "MS")).all()
    return {municipio.codigo_ibge: municipio for municipio in municipios}


def _obter_indicadores(db: Session) -> dict[str, models.Indicador]:
    indicadores = db.scalars(select(models.Indicador)).all()
    return {indicador.codigo: indicador for indicador in indicadores}


def _normalizar_codigo_sinisa(valor: object) -> str:
    """Normaliza códigos que aparecem com espaços ou asterisco na planilha."""
    return re.sub(r"\s+", "", str(valor).strip())


def _texto_cabecalho(valor: object, fallback: str) -> str:
    if pd.isna(valor):
        return fallback
    texto = " ".join(str(valor).split())
    return texto or fallback


def _metadados_colunas(
    arquivo: Path,
    sheet_name: str | int,
    codigo_header: int,
    descricao_header: int,
    unidade_header: int,
) -> dict[str, tuple[str, str | None]]:
    """Lê nome e unidade das linhas de cabeçalho da planilha oficial."""
    nrows = max(codigo_header, descricao_header, unidade_header) + 1
    cabecalho = pd.read_excel(arquivo, sheet_name=sheet_name, header=None, nrows=nrows)
    codigos = cabecalho.iloc[codigo_header]
    descricoes = cabecalho.iloc[descricao_header]
    unidades = cabecalho.iloc[unidade_header]
    metadados: dict[str, tuple[str, str | None]] = {}
    for indice, valor in codigos.items():
        codigo = _normalizar_codigo_sinisa(valor)
        if not codigo or codigo.lower() == "nan":
            continue
        descricao = _texto_cabecalho(descricoes.get(indice), codigo)
        unidade_valor = unidades.get(indice)
        unidade = None if pd.isna(unidade_valor) else _texto_cabecalho(unidade_valor, "")
        metadados[codigo] = (descricao, unidade or None)
    return metadados


def _obter_ou_criar_indicador(
    db: Session,
    indicadores: dict[str, models.Indicador],
    codigo_sinisa: str,
    descricao: str,
    unidade: str | None,
    tema: str,
) -> models.Indicador:
    codigo_cesam = MAPEAMENTO_SINISA_CESAM.get(codigo_sinisa, codigo_sinisa)
    indicador = indicadores.get(codigo_cesam)
    if indicador is not None:
        return indicador

    indicador = db.scalar(select(models.Indicador).where(models.Indicador.codigo == codigo_cesam))
    if indicador is not None:
        indicadores[codigo_cesam] = indicador
        return indicador

    indicador = models.Indicador(
        codigo=codigo_cesam,
        nome=descricao,
        tema=tema,
        descricao=f"Indicador oficial SINISA {codigo_sinisa}.",
        unidade=unidade,
        fonte="SINISA",
        sentido="neutro",
    )
    db.add(indicador)
    db.flush()
    indicadores[codigo_cesam] = indicador
    return indicador


def _limpar_importacao_anterior(db: Session) -> None:
    fontes = db.scalars(select(models.FonteDados).where(models.FonteDados.nome == FONTE_NOME)).all()
    fonte_ids = [fonte.id for fonte in fontes]
    if fonte_ids:
        db.execute(delete(models.ValorIndicador).where(models.ValorIndicador.fonte_dados_id.in_(fonte_ids)))
        db.execute(delete(models.FonteDados).where(models.FonteDados.id.in_(fonte_ids)))
    db.execute(delete(models.LogImportacao).where(models.LogImportacao.fonte == FONTE_NOME))


def _criar_fonte(db: Session) -> models.FonteDados:
    fonte = models.FonteDados(
        nome=FONTE_NOME,
        origem=FONTE_ORIGEM,
        ano_referencia=ANO_REFERENCIA,
        url_origem=URL_RESULTADOS,
        nome_arquivo="Planilhas Indicadores / SINISA 2024",
        observacoes="Importação oficial SINISA 2024, ano de referência 2024, com base municipal para MS.",
    )
    db.add(fonte)
    db.flush()
    return fonte


def _registrar_valor(
    db: Session,
    municipio: models.Municipio,
    indicador: models.Indicador,
    fonte: models.FonteDados,
    valor_original: object,
    observacoes: str,
) -> bool:
    valor, erro = converter_valor(valor_original)
    if erro or valor is None:
        return False

    db.add(
        models.ValorIndicador(
            municipio_id=municipio.id,
            indicador_id=indicador.id,
            ano=ANO_REFERENCIA,
            valor=valor,
            fonte_dados_id=fonte.id,
            status_validacao="oficial_sinisa",
            observacoes=observacoes,
        )
    )
    return True


def _importar_planilha_codigos(
    db: Session,
    arquivo: Path,
    mapeamento: list[tuple[str, str, str]],
    fonte: models.FonteDados,
    municipios: dict[str, models.Municipio],
    indicadores: dict[str, models.Indicador],
    tema: str,
    header: int,
    codigo_coluna: str,
) -> tuple[int, int, list[str]]:
    importados = 0
    erros = 0
    avisos: list[str] = []
    df = pd.read_excel(arquivo, sheet_name=0, header=header)
    if codigo_coluna not in df.columns or "UF" not in df.columns:
        return 0, 1, [f"{arquivo.name}: colunas de município ausentes ({codigo_coluna}, UF)"]

    df = df[df["UF"].astype(str).str.strip().eq("MS")].copy()
    for indicador_codigo, coluna, descricao in mapeamento:
        indicador = indicadores.get(indicador_codigo)
        if indicador is None:
            erros += 1
            avisos.append(f"Indicador não cadastrado: {indicador_codigo}")
            continue
        if coluna not in df.columns:
            erros += 1
            avisos.append(f"{arquivo.name}: coluna ausente: {coluna}")
            continue

        for _, row in df.iterrows():
            codigo = _normalizar_codigo(row[codigo_coluna])
            municipio = municipios.get(codigo)
            if municipio is None:
                erros += 1
                avisos.append(f"{arquivo.name}: município MS não cadastrado: {codigo}")
                continue
            ok = _registrar_valor(
                db,
                municipio,
                indicador,
                fonte,
                row[coluna],
                f"{tema} - SINISA {coluna}: {descricao}",
            )
            importados += int(ok)
            erros += int(not ok)

    return importados, erros, avisos


def _importar_todos_indicadores_codificados(
    db: Session,
    arquivo: Path,
    fonte: models.FonteDados,
    municipios: dict[str, models.Municipio],
    indicadores: dict[str, models.Indicador],
    tema: str,
    sheet_name: str | int,
    header: int,
    descricao_header: int,
    unidade_header: int,
    codigo_coluna: str,
    prefixos: tuple[str, ...],
    codigos_ignorados: set[str] | None = None,
) -> tuple[int, int, list[str]]:
    """Importa todas as colunas de indicadores oficiais de uma base municipal."""
    df = pd.read_excel(arquivo, sheet_name=sheet_name, header=header)
    if codigo_coluna not in df.columns or "UF" not in df.columns:
        return 0, 1, [f"{arquivo.name}: colunas de município ausentes ({codigo_coluna}, UF)"]

    metadados = _metadados_colunas(
        arquivo,
        sheet_name,
        header,
        descricao_header,
        unidade_header,
    )
    ignorados = codigos_ignorados or set()
    colunas = {
        _normalizar_codigo_sinisa(coluna): coluna
        for coluna in df.columns
        if _normalizar_codigo_sinisa(coluna).startswith(prefixos)
        and _normalizar_codigo_sinisa(coluna) not in ignorados
    }
    if not colunas:
        return 0, 1, [f"{arquivo.name}: nenhum indicador encontrado ({', '.join(prefixos)})"]

    df = df[df["UF"].astype(str).str.strip().eq("MS")].copy()
    importados = 0
    erros = 0
    avisos: list[str] = []
    for codigo_sinisa, coluna in colunas.items():
        descricao, unidade = metadados.get(codigo_sinisa, (codigo_sinisa, None))
        indicador = _obter_ou_criar_indicador(
            db,
            indicadores,
            codigo_sinisa,
            descricao,
            unidade,
            tema,
        )
        for _, row in df.iterrows():
            codigo_municipio = _normalizar_codigo(row[codigo_coluna])
            municipio = municipios.get(codigo_municipio)
            if municipio is None:
                erros += 1
                avisos.append(f"{arquivo.name}: município MS não cadastrado: {codigo_municipio}")
                continue
            ok = _registrar_valor(
                db,
                municipio,
                indicador,
                fonte,
                row[coluna],
                f"{tema} - SINISA {codigo_sinisa}: {descricao}",
            )
            importados += int(ok)
            erros += int(not ok)
    return importados, erros, avisos


def _importar_informacao_rede(
    db: Session,
    arquivo: Path,
    indicador_codigo: str,
    codigo_sinisa: str,
    descricao: str,
    fonte: models.FonteDados,
    municipios: dict[str, models.Municipio],
    indicadores: dict[str, models.Indicador],
) -> tuple[int, int, list[str]]:
    previa = pd.read_excel(arquivo, sheet_name=0, header=None, nrows=20)
    linha_codigo = next(
        (indice for indice in previa.index if codigo_sinisa in previa.loc[indice].astype(str).str.strip().tolist()),
        None,
    )
    if linha_codigo is None:
        return 0, 1, [f"{arquivo.name}: código SINISA ausente: {codigo_sinisa}"]

    df = pd.read_excel(arquivo, sheet_name=0, header=linha_codigo)
    obrigatorias = {"cod_IBGE", "UF", codigo_sinisa}
    faltantes = obrigatorias.difference(df.columns)
    if faltantes:
        return 0, 1, [f"{arquivo.name}: colunas ausentes: {', '.join(sorted(faltantes))}"]

    df = df[df["UF"].astype(str).str.strip().eq("MS")].copy()
    importados = 0
    erros = 0
    avisos: list[str] = []
    indicador = indicadores[indicador_codigo]
    for _, row in df.iterrows():
        codigo = _normalizar_codigo(row["cod_IBGE"])
        municipio = municipios.get(codigo)
        if municipio is None:
            erros += 1
            avisos.append(f"{arquivo.name}: município MS não cadastrado: {codigo}")
            continue
        ok = _registrar_valor(
            db,
            municipio,
            indicador,
            fonte,
            row[codigo_sinisa],
            f"SINISA {codigo_sinisa} - {descricao}",
        )
        importados += int(ok)
        erros += int(not ok)
    return importados, erros, avisos


def _importar_residuos(
    db: Session,
    arquivo: Path,
    fonte: models.FonteDados,
    municipios: dict[str, models.Municipio],
    indicadores: dict[str, models.Indicador],
) -> tuple[int, int, list[str]]:
    df = pd.read_excel(arquivo, sheet_name="Planilha_Indicadores_municipais", header=10)
    codigo_coluna = "CÓDIGO DO IBGE"
    if codigo_coluna not in df.columns or "UF" not in df.columns:
        return 0, 1, [f"{arquivo.name}: colunas de município ausentes"]

    df = df[df["UF"].astype(str).str.strip().eq("MS")].copy()
    importados = 0
    erros = 0
    avisos: list[str] = []
    for _, row in df.iterrows():
        codigo = _normalizar_codigo(row[codigo_coluna])
        municipio = municipios.get(codigo)
        if municipio is None:
            erros += 1
            avisos.append(f"Resíduos Sólidos: município MS não cadastrado: {codigo}")
            continue
        for indicador_codigo, coluna in MAPEAMENTO_RESIDUOS:
            indicador = indicadores[indicador_codigo]
            if coluna not in df.columns:
                erros += 1
                avisos.append(f"{arquivo.name}: coluna ausente: {coluna}")
                continue
            ok = _registrar_valor(
                db,
                municipio,
                indicador,
                fonte,
                row[coluna],
                f"Resíduos Sólidos - indicador oficial {coluna}",
            )
            importados += int(ok)
            erros += int(not ok)
    return importados, erros, avisos


def _importar_aguas_pluviais(
    db: Session,
    arquivo: Path,
    fonte: models.FonteDados,
    municipios: dict[str, models.Municipio],
    indicadores: dict[str, models.Indicador],
) -> tuple[int, int, list[str]]:
    df = pd.read_excel(arquivo, sheet_name=0, header=7)
    codigo_coluna = "Código IBGE"
    if codigo_coluna not in df.columns or "UF" not in df.columns:
        return 0, 1, [f"{arquivo.name}: colunas de município ausentes"]

    df = df[df["UF"].astype(str).str.strip().eq("MS")].copy()
    importados = 0
    erros = 0
    avisos: list[str] = []
    for _, row in df.iterrows():
        codigo = _normalizar_codigo(row[codigo_coluna])
        municipio = municipios.get(codigo)
        if municipio is None:
            erros += 1
            avisos.append(f"Águas Pluviais: município MS não cadastrado: {codigo}")
            continue
        for indicador_codigo, indice_coluna, descricao in MAPEAMENTO_AGUAS_PLUVIAIS:
            coluna = df.columns[indice_coluna]
            indicador = indicadores[indicador_codigo]
            ok = _registrar_valor(
                db,
                municipio,
                indicador,
                fonte,
                row.iloc[indice_coluna],
                f"Águas Pluviais - {coluna}: {descricao}",
            )
            importados += int(ok)
            erros += int(not ok)
    return importados, erros, avisos


def _importar_todos_indicadores_pluviais(
    db: Session,
    arquivo: Path,
    fonte: models.FonteDados,
    municipios: dict[str, models.Municipio],
    indicadores: dict[str, models.Indicador],
) -> tuple[int, int, list[str]]:
    """Importa todas as colunas IGE/IFD/IAP/IGR da planilha de drenagem."""
    sheet_name = 0
    header = 7
    codigo_header = 10
    df = pd.read_excel(arquivo, sheet_name=sheet_name, header=header)
    if "Código IBGE" not in df.columns or "UF" not in df.columns:
        return 0, 1, [f"{arquivo.name}: colunas de município ausentes"]

    cabecalho = pd.read_excel(arquivo, sheet_name=sheet_name, header=None, nrows=codigo_header + 1)
    codigos = cabecalho.iloc[codigo_header]
    descricoes = cabecalho.iloc[header]
    unidades = cabecalho.iloc[9]
    colunas: dict[str, object] = {}
    metadados: dict[str, tuple[str, str | None]] = {}
    for indice, coluna in enumerate(df.columns):
        codigo = _normalizar_codigo_sinisa(codigos.get(indice))
        if not codigo.startswith(("IGE", "IFD", "IAP", "IGR")):
            continue
        colunas[codigo] = coluna
        descricao = _texto_cabecalho(descricoes.get(indice), codigo)
        unidade_valor = unidades.get(indice)
        unidade = None if pd.isna(unidade_valor) else _texto_cabecalho(unidade_valor, "")
        metadados[codigo] = (descricao, unidade or None)

    if not colunas:
        return 0, 1, [f"{arquivo.name}: nenhum indicador de águas pluviais encontrado"]

    df = df[df["UF"].astype(str).str.strip().eq("MS")].copy()
    importados = 0
    erros = 0
    avisos: list[str] = []
    for codigo_sinisa, coluna in colunas.items():
        descricao, unidade = metadados[codigo_sinisa]
        indicador = _obter_ou_criar_indicador(
            db,
            indicadores,
            codigo_sinisa,
            descricao,
            unidade,
            "Águas pluviais",
        )
        for _, row in df.iterrows():
            codigo_municipio = _normalizar_codigo(row["Código IBGE"])
            municipio = municipios.get(codigo_municipio)
            if municipio is None:
                erros += 1
                avisos.append(f"{arquivo.name}: município MS não cadastrado: {codigo_municipio}")
                continue
            ok = _registrar_valor(
                db,
                municipio,
                indicador,
                fonte,
                row[coluna],
                f"Águas Pluviais - SINISA {codigo_sinisa}: {descricao}",
            )
            importados += int(ok)
            erros += int(not ok)
    return importados, erros, avisos


def _valor_composto(row: pd.Series, colunas: tuple[str, ...]) -> float | None:
    valores: list[float] = []
    for coluna in colunas:
        valor, erro = converter_valor(row.get(coluna))
        if not erro and valor is not None:
            valores.append(valor)
    return max(valores) if valores else None


def _importar_gestao(
    db: Session,
    arquivo: Path,
    fonte: models.FonteDados,
    municipios: dict[str, models.Municipio],
    indicadores: dict[str, models.Indicador],
) -> tuple[int, int, list[str]]:
    df = pd.read_excel(arquivo, sheet_name="GM", header=10)
    if "Cod_IBGE" not in df.columns or "UF" not in df.columns:
        return 0, 1, [f"{arquivo.name}: colunas Cod_IBGE/UF ausentes"]

    df = df[df["UF"].astype(str).str.strip().eq("MS")].copy()
    importados = 0
    erros = 0
    avisos: list[str] = []
    campos = [
        MAPEAMENTO_GESTAO["gestao_plano_municipal_saneamento"],
        *MAPEAMENTO_GESTAO["gestao_conselho_municipal"],
        *MAPEAMENTO_GESTAO["gestao_agencia_reguladora"],
    ]
    faltantes = [campo for campo in campos if campo not in df.columns]
    if faltantes:
        return 0, 1, [f"{arquivo.name}: colunas ausentes: {', '.join(faltantes)}"]

    for _, row in df.iterrows():
        codigo = _normalizar_codigo(row["Cod_IBGE"])
        municipio = municipios.get(codigo)
        if municipio is None:
            erros += 1
            avisos.append(f"Gestão Municipal: município MS não cadastrado: {codigo}")
            continue

        valores = {
            "gestao_plano_municipal_saneamento": (
                row[MAPEAMENTO_GESTAO["gestao_plano_municipal_saneamento"]],
                "Existência de Plano de Saneamento Básico",
            ),
            "gestao_conselho_municipal": (
                _valor_composto(row, MAPEAMENTO_GESTAO["gestao_conselho_municipal"]),
                "Existência de Conselho Municipal de saneamento ou afins",
            ),
            "gestao_agencia_reguladora": (
                _valor_composto(row, MAPEAMENTO_GESTAO["gestao_agencia_reguladora"]),
                "Existência de entidade responsável pela regulação em qualquer componente",
            ),
        }
        for indicador_codigo, (valor, descricao) in valores.items():
            ok = _registrar_valor(
                db,
                municipio,
                indicadores[indicador_codigo],
                fonte,
                valor,
                f"Gestão Municipal - {descricao}",
            )
            importados += int(ok)
            erros += int(not ok)
    return importados, erros, avisos


def _importar_demais_indicadores_gestao(
    db: Session,
    arquivo: Path,
    fonte: models.FonteDados,
    municipios: dict[str, models.Municipio],
    indicadores: dict[str, models.Indicador],
) -> tuple[int, int, list[str]]:
    """Importa os demais campos numéricos do módulo Gestão Municipal."""
    df = pd.read_excel(arquivo, sheet_name="GM", header=10)
    if "Cod_IBGE" not in df.columns or "UF" not in df.columns:
        return 0, 1, [f"{arquivo.name}: colunas Cod_IBGE/UF ausentes"]

    codigos_mapeados = {
        _normalizar_codigo_sinisa(codigo)
        for codigo in (
            MAPEAMENTO_GESTAO["gestao_plano_municipal_saneamento"],
            *MAPEAMENTO_GESTAO["gestao_conselho_municipal"],
            *MAPEAMENTO_GESTAO["gestao_agencia_reguladora"],
        )
    }
    colunas = {
        _normalizar_codigo_sinisa(coluna): coluna
        for coluna in df.columns
        if _normalizar_codigo_sinisa(coluna).startswith(("CAD", "DFE", "OGM"))
        and _normalizar_codigo_sinisa(coluna) not in codigos_mapeados
    }
    if not colunas:
        return 0, 0, []

    df = df[df["UF"].astype(str).str.strip().eq("MS")].copy()
    importados = 0
    erros = 0
    avisos: list[str] = []
    for codigo_sinisa, coluna in colunas.items():
        indicador = _obter_ou_criar_indicador(
            db,
            indicadores,
            codigo_sinisa,
            codigo_sinisa,
            None,
            "Gestão municipal",
        )
        for _, row in df.iterrows():
            codigo_municipio = _normalizar_codigo(row["Cod_IBGE"])
            municipio = municipios.get(codigo_municipio)
            if municipio is None:
                erros += 1
                avisos.append(f"{arquivo.name}: município MS não cadastrado: {codigo_municipio}")
                continue
            ok = _registrar_valor(
                db,
                municipio,
                indicador,
                fonte,
                row[coluna],
                f"Gestão Municipal - SINISA {codigo_sinisa}",
            )
            importados += int(ok)
            erros += int(not ok)
    return importados, erros, avisos


def _extrair_indicadores_pluviais(arquivo_zip: Path, destino: Path) -> Path:
    with ZipFile(arquivo_zip) as arquivo:
        nome = next(
            nome
            for nome in arquivo.namelist()
            if "Indicadores_AP2024" in nome and nome.lower().endswith(".xlsx")
        )
        destino_arquivo = destino / Path(nome).name
        destino_arquivo.write_bytes(arquivo.read(nome))
        return destino_arquivo


def _salvar_resumo_processado(db: Session, fonte_id: int) -> None:
    query = """
        select m.codigo_ibge, m.nome as municipio, m.uf, i.codigo as indicador,
               i.nome, i.tema, vi.ano, vi.valor, vi.status_validacao, vi.observacoes
        from valores_indicadores vi
        join municipios m on m.id = vi.municipio_id
        join indicadores i on i.id = vi.indicador_id
        where vi.fonte_dados_id = :fonte_id
        order by m.nome, i.tema, i.nome
    """
    df = pd.read_sql_query(text(query), db.connection(), params={"fonte_id": fonte_id})
    saida = DATA_DIR / "processed" / "sinisa_2024_ms_indicadores_tratado.csv"
    saida.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(saida, index=False, encoding="utf-8-sig")


def main() -> None:
    faltantes = [
        str(PLANILHAS_DIR / caminho)
        for caminho in ARQUIVOS_OBRIGATORIOS
        if not (PLANILHAS_DIR / caminho).exists()
    ]
    if faltantes:
        raise SystemExit("Arquivos SINISA 2024 ausentes: " + "; ".join(faltantes))

    migrar()
    with SessionLocal() as db:
        seed_all(db)
        _limpar_importacao_anterior(db)
        fonte = _criar_fonte(db)
        municipios = _obter_municipios(db)
        indicadores = _obter_indicadores(db)
        total_importados = 0
        total_erros = 0
        avisos: list[str] = []

        def acumular(resultado: tuple[int, int, list[str]]) -> None:
            nonlocal total_importados, total_erros
            importados, erros, novos_avisos = resultado
            total_importados += importados
            total_erros += erros
            avisos.extend(novos_avisos)

        agua = PLANILHAS_DIR / ARQUIVOS_OBRIGATORIOS[0]
        agua_tecnica = PLANILHAS_DIR / ARQUIVOS_OBRIGATORIOS[1]
        esgoto = PLANILHAS_DIR / ARQUIVOS_OBRIGATORIOS[2]
        esgoto_tecnica = PLANILHAS_DIR / ARQUIVOS_OBRIGATORIOS[3]
        residuos = PLANILHAS_DIR / ARQUIVOS_OBRIGATORIOS[4]
        pluviais_zip = PLANILHAS_DIR / ARQUIVOS_OBRIGATORIOS[5]
        gestao = PLANILHAS_DIR / ARQUIVOS_OBRIGATORIOS[6]

        acumular(
            _importar_todos_indicadores_codificados(
                db,
                agua,
                fonte,
                municipios,
                indicadores,
                "Água",
                0,
                11,
                9,
                10,
                "cod_IBGE",
                ("IAG", "IFA"),
            )
        )
        acumular(
            _importar_todos_indicadores_codificados(
                db,
                esgoto,
                fonte,
                municipios,
                indicadores,
                "Esgoto",
                0,
                10,
                8,
                9,
                "cod_IBGE",
                ("IES", "IFE"),
            )
        )
        for arquivo, mapeamento in [(agua_tecnica, MAPEAMENTO_REDE[0]), (esgoto_tecnica, MAPEAMENTO_REDE[1])]:
            acumular(_importar_informacao_rede(db, arquivo, *mapeamento, fonte, municipios, indicadores))
        acumular(
            _importar_todos_indicadores_codificados(
                db,
                residuos,
                fonte,
                municipios,
                indicadores,
                "Resíduos sólidos",
                "Planilha_Indicadores_municipais",
                10,
                11,
                12,
                "CÓDIGO DO IBGE",
                ("IFR", "IRS"),
            )
        )
        acumular(_importar_gestao(db, gestao, fonte, municipios, indicadores))
        acumular(_importar_demais_indicadores_gestao(db, gestao, fonte, municipios, indicadores))

        with TemporaryDirectory() as tmp:
            pluviais = _extrair_indicadores_pluviais(pluviais_zip, Path(tmp))
            acumular(_importar_todos_indicadores_pluviais(db, pluviais, fonte, municipios, indicadores))

        db.add(
            models.LogImportacao(
                arquivo="Planilhas Indicadores / SINISA 2024",
                fonte=FONTE_NOME,
                ano_referencia=ANO_REFERENCIA,
                total_linhas=total_importados + total_erros,
                linhas_importadas=total_importados,
                linhas_com_erro=total_erros,
                mensagem="; ".join(avisos[:30]) if avisos else "Importação SINISA 2024 concluída.",
            )
        )
        db.commit()
        _salvar_resumo_processado(db, fonte.id)

    print(f"SINISA 2024: {total_importados} valores importados, {total_erros} ignorados/sem valor.")
    for aviso in avisos[:10]:
        print(f"aviso: {aviso}")


if __name__ == "__main__":
    main()
