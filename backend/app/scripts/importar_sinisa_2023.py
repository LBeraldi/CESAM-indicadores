from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile

import pandas as pd
from sqlalchemy import delete, select
from sqlalchemy.sql import text
from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal, init_db
from app.seed import DATA_DIR, seed_all
from app.services.validacao import converter_valor


ANO_REFERENCIA = 2023
FONTE_NOME = "SINISA 2023"
FONTE_ORIGEM = "Ministério das Cidades / SINISA"
URL_RESULTADOS = (
    "https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/"
    "saneamento/sinisa/resultados-sinisa"
)

ARQUIVOS_OBRIGATORIOS = [
    "SINISA_Resultados_Ref2023.zip",
    "SINISA_ESGOTO_Planilhas_2023_v2.zip",
    "SINISA_GESTAOMUNICIPAL_Informacoes_2023.xlsx",
    "SINISA_RESIDUOS_Indicadores_2023.xlsx",
    "SINISA_AGUASPLUVIAIS_Indicadores_2023_v2.zip",
]

MAPEAMENTO_AGUA = [
    (
        "Atendimento",
        "agua_atendimento_total",
        "Atendimento da população total com rede de abastecimento de água",
    ),
    (
        "Atendimento",
        "agua_atendimento_urbano",
        "Atendimento da população urbana com rede de abastecimento de água",
    ),
    (
        "Estruturais e Operacionais",
        "agua_perdas_distribuicao",
        "Perdas totais de água na distribuição",
    ),
    (
        "Estruturais e Operacionais",
        "agua_consumo_per_capita",
        "Consumo total médio per capita de água",
    ),
]

MAPEAMENTO_ESGOTO = [
    (
        "Atendimento",
        "esgoto_atendimento_total",
        "Atendimento da população total com rede coletora de esgoto",
    ),
    (
        "Atendimento",
        "esgoto_atendimento_urbano",
        "Atendimento da população urbana com rede coletora de esgoto",
    ),
    (
        "Estruturais e Operacionais",
        "esgoto_coleta",
        "Esgoto coletado referido à água\nconsumida",
    ),
    (
        "Estruturais e Operacionais",
        "esgoto_tratamento",
        "Esgoto tratado referido ao esgoto coletado",
    ),
]

MAPEAMENTO_RESIDUOS = [
    ("residuos_cobertura_coleta_domiciliar", "IRS0001"),
    ("residuos_cobertura_coleta_seletiva", "IRS0005"),
    ("residuos_massa_coletada_per_capita", "IRS1004"),
    ("residuos_massa_recuperada_per_capita", "IRS1008"),
]

MAPEAMENTO_AGUAS_PLUVIAIS = [
    ("aguas_pluviais_vias_pavimentadas", 24),
    ("aguas_pluviais_rede_subterranea", 25),
    ("aguas_pluviais_domicilios_risco_inundacao", 33),
    ("aguas_pluviais_populacao_impactada", 34),
]


def _normalizar_codigo(valor: object) -> str:
    texto = str(valor).strip().split(".")[0]
    return texto.zfill(7)


def _obter_municipios(db: Session) -> dict[str, models.Municipio]:
    municipios = db.scalars(select(models.Municipio).where(models.Municipio.uf == "MS")).all()
    return {municipio.codigo_ibge: municipio for municipio in municipios}


def _obter_indicadores(db: Session) -> dict[str, models.Indicador]:
    indicadores = db.scalars(select(models.Indicador)).all()
    return {indicador.codigo: indicador for indicador in indicadores}


def _limpar_importacao_anterior(db: Session) -> None:
    fontes = db.scalars(select(models.FonteDados).where(models.FonteDados.nome == FONTE_NOME)).all()
    fonte_ids = [fonte.id for fonte in fontes]
    if fonte_ids:
        db.execute(delete(models.ValorIndicador).where(models.ValorIndicador.fonte_dados_id.in_(fonte_ids)))
        db.execute(delete(models.FonteDados).where(models.FonteDados.id.in_(fonte_ids)))
    db.execute(delete(models.LogImportacao).where(models.LogImportacao.fonte == FONTE_NOME))
    db.commit()


def _criar_fonte(db: Session) -> models.FonteDados:
    fonte = models.FonteDados(
        nome=FONTE_NOME,
        origem=FONTE_ORIGEM,
        ano_referencia=ANO_REFERENCIA,
        url_origem=URL_RESULTADOS,
        nome_arquivo="; ".join(ARQUIVOS_OBRIGATORIOS),
        observacoes="Importação oficial SINISA 2024, ano de referência 2023, com base municipal para MS.",
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


def _extrair_primeiro(zip_path: Path, marcador: str, destino: Path) -> Path:
    with ZipFile(zip_path) as zip_file:
        nome = next(
            entrada
            for entrada in zip_file.namelist()
            if marcador in entrada and entrada.lower().endswith(".xlsx")
        )
        zip_file.extract(nome, destino)
        return destino / nome


def _importar_planilha_indicadores(
    db: Session,
    arquivo: Path,
    mapeamento: list[tuple[str, str, str]],
    fonte: models.FonteDados,
    municipios: dict[str, models.Municipio],
    indicadores: dict[str, models.Indicador],
    tema: str,
) -> tuple[int, int, list[str]]:
    importados = 0
    erros = 0
    avisos: list[str] = []

    for sheet_name, indicador_codigo, coluna in mapeamento:
        indicador = indicadores[indicador_codigo]
        df = pd.read_excel(arquivo, sheet_name=sheet_name, header=7)
        df = df[df["UF"].astype(str).str.strip().eq("MS")].copy()
        if coluna not in df.columns:
            avisos.append(f"{arquivo.name}/{sheet_name}: coluna ausente: {coluna}")
            continue

        for _, row in df.iterrows():
            codigo = _normalizar_codigo(row["Codigo do IBGE"])
            municipio = municipios.get(codigo)
            if not municipio:
                erros += 1
                avisos.append(f"{arquivo.name}/{sheet_name}: município MS não cadastrado: {codigo}")
                continue

            ok = _registrar_valor(
                db,
                municipio,
                indicador,
                fonte,
                row[coluna],
                f"{tema} - {sheet_name}: {coluna}",
            )
            if ok:
                importados += 1
            else:
                erros += 1

    return importados, erros, avisos


def _importar_gestao(
    db: Session,
    arquivo: Path,
    fonte: models.FonteDados,
    municipios: dict[str, models.Municipio],
    indicadores: dict[str, models.Indicador],
) -> tuple[int, int, list[str]]:
    importados = 0
    erros = 0
    avisos: list[str] = []

    plano = pd.read_excel(arquivo, sheet_name="GM - Política e Planos", header=None, skiprows=14)
    conselho = pd.read_excel(arquivo, sheet_name="GM - Controle Social", header=None, skiprows=14)

    # Estrutura oficial da planilha de Gestão Municipal: colunas por posição.
    for _, row in plano[plano[3].astype(str).str.strip().eq("MS")].iterrows():
        codigo = _normalizar_codigo(row[1])
        municipio = municipios.get(codigo)
        if not municipio:
            erros += 1
            avisos.append(f"Gestão Municipal/Política e Planos: município MS não cadastrado: {codigo}")
            continue
        ok = _registrar_valor(
            db,
            municipio,
            indicadores["gestao_plano_municipal_saneamento"],
            fonte,
            row[11],
            "Gestão Municipal - Política e Planos: Existência de Plano de Saneamento Básico",
        )
        importados += int(ok)
        erros += int(not ok)

    for _, row in conselho[conselho[3].astype(str).str.strip().eq("MS")].iterrows():
        codigo = _normalizar_codigo(row[1])
        municipio = municipios.get(codigo)
        if not municipio:
            erros += 1
            avisos.append(f"Gestão Municipal/Controle Social: município MS não cadastrado: {codigo}")
            continue
        ok = _registrar_valor(
            db,
            municipio,
            indicadores["gestao_conselho_municipal"],
            fonte,
            row[7],
            "Gestão Municipal - Controle Social: Existência de Conselho Municipal de saneamento ou afins",
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
    importados = 0
    erros = 0
    avisos: list[str] = []
    df = pd.read_excel(arquivo, sheet_name="Planilha de Indicadores", header=10)
    df = df[df["UF"].astype(str).str.strip().eq("MS")].copy()

    for _, row in df.iterrows():
        codigo = _normalizar_codigo(row["CÓDIGO DO IBGE"])
        municipio = municipios.get(codigo)
        if not municipio:
            erros += 1
            avisos.append(f"Resíduos Sólidos: município MS não cadastrado: {codigo}")
            continue

        for indicador_codigo, coluna in MAPEAMENTO_RESIDUOS:
            ok = _registrar_valor(
                db,
                municipio,
                indicadores[indicador_codigo],
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
    importados = 0
    erros = 0
    avisos: list[str] = []
    df = pd.read_excel(arquivo, sheet_name="Indicadores por município", header=7)
    df = df[df["UF"].astype(str).str.strip().eq("MS")].copy()

    for _, row in df.iterrows():
        codigo = _normalizar_codigo(row["Código IBGE"])
        municipio = municipios.get(codigo)
        if not municipio:
            erros += 1
            avisos.append(f"Águas Pluviais: município MS não cadastrado: {codigo}")
            continue

        for indicador_codigo, indice_coluna in MAPEAMENTO_AGUAS_PLUVIAIS:
            coluna = df.columns[indice_coluna]
            ok = _registrar_valor(
                db,
                municipio,
                indicadores[indicador_codigo],
                fonte,
                row.iloc[indice_coluna],
                f"Águas Pluviais - {coluna}",
            )
            importados += int(ok)
            erros += int(not ok)

    return importados, erros, avisos


def _salvar_resumo_processado(db: Session, fonte_id: int) -> None:
    query = """
        select
            m.codigo_ibge,
            m.nome as municipio,
            m.uf,
            i.codigo as indicador,
            i.nome,
            i.tema,
            vi.ano,
            vi.valor,
            vi.status_validacao,
            vi.observacoes
        from valores_indicadores vi
        join municipios m on m.id = vi.municipio_id
        join indicadores i on i.id = vi.indicador_id
        where vi.fonte_dados_id = :fonte_id
        order by m.nome, i.tema, i.nome
    """
    df = pd.read_sql_query(text(query), db.connection(), params={"fonte_id": fonte_id})
    saida = DATA_DIR / "processed" / "sinisa_2023_ms_indicadores_tratado.csv"
    saida.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(saida, index=False, encoding="utf-8-sig")


def main() -> None:
    raw_dir = DATA_DIR / "raw"
    faltantes = [nome for nome in ARQUIVOS_OBRIGATORIOS if not (raw_dir / nome).exists()]
    if faltantes:
        raise SystemExit(f"Arquivos oficiais ausentes em data/raw: {', '.join(faltantes)}")

    init_db()
    with SessionLocal() as db:
        seed_all(db)
        _limpar_importacao_anterior(db)
        fonte = _criar_fonte(db)
        municipios = _obter_municipios(db)
        indicadores = _obter_indicadores(db)

        total_importados = 0
        total_erros = 0
        avisos: list[str] = []

        with TemporaryDirectory() as tmp:
            temp_dir = Path(tmp)
            agua = _extrair_primeiro(raw_dir / "SINISA_Resultados_Ref2023.zip", "AGUA_Indicadores_Base Municipal", temp_dir)
            esgoto = _extrair_primeiro(
                raw_dir / "SINISA_ESGOTO_Planilhas_2023_v2.zip",
                "ESGOTO_Indicadores_Base Municipal",
                temp_dir,
            )
            aguas_pluviais = _extrair_primeiro(
                raw_dir / "SINISA_AGUASPLUVIAIS_Indicadores_2023_v2.zip",
                "Indicadores_2023",
                temp_dir,
            )

            for arquivo, mapeamento, tema in [
                (agua, MAPEAMENTO_AGUA, "Abastecimento de Água"),
                (esgoto, MAPEAMENTO_ESGOTO, "Esgotamento Sanitário"),
            ]:
                importados, erros, novos_avisos = _importar_planilha_indicadores(
                    db, arquivo, mapeamento, fonte, municipios, indicadores, tema
                )
                total_importados += importados
                total_erros += erros
                avisos.extend(novos_avisos)

            importados, erros, novos_avisos = _importar_aguas_pluviais(
                db, aguas_pluviais, fonte, municipios, indicadores
            )
            total_importados += importados
            total_erros += erros
            avisos.extend(novos_avisos)

        importados, erros, novos_avisos = _importar_residuos(
            db,
            raw_dir / "SINISA_RESIDUOS_Indicadores_2023.xlsx",
            fonte,
            municipios,
            indicadores,
        )
        total_importados += importados
        total_erros += erros
        avisos.extend(novos_avisos)

        importados, erros, novos_avisos = _importar_gestao(
            db,
            raw_dir / "SINISA_GESTAOMUNICIPAL_Informacoes_2023.xlsx",
            fonte,
            municipios,
            indicadores,
        )
        total_importados += importados
        total_erros += erros
        avisos.extend(novos_avisos)

        db.add(
            models.LogImportacao(
                arquivo="; ".join(ARQUIVOS_OBRIGATORIOS),
                fonte=FONTE_NOME,
                ano_referencia=ANO_REFERENCIA,
                total_linhas=total_importados + total_erros,
                linhas_importadas=total_importados,
                linhas_com_erro=total_erros,
                mensagem="; ".join(avisos[:30]) if avisos else "Importação SINISA 2023 concluída.",
            )
        )
        db.commit()
        _salvar_resumo_processado(db, fonte.id)

    print(f"SINISA 2023: {total_importados} valores importados, {total_erros} ignorados/sem valor.")
    for aviso in avisos[:10]:
        print(f"aviso: {aviso}")


if __name__ == "__main__":
    main()
