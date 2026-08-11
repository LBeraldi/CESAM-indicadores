from pathlib import Path

import pandas as pd
from sqlalchemy import delete, select
from sqlalchemy.sql import text
from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal, init_db
from app.seed import DATA_DIR, seed_all
from app.services.validacao import converter_valor


FONTE_NOME = "SNIS Serie Historica 1995-2022"
FONTE_ORIGEM = "Ministerio das Cidades / SNIS Serie Historica"
URL_ORIGEM = "https://app4.mdr.gov.br/serieHistorica/"
ARQUIVO_CSV = "br_mdr_snis_municipio_agua_esgoto.csv.gz"

DOWNLOAD_URL = (
    "https://basedosdados.org/api/tables/downloadTable"
    "?p=YnJfbWRyX3NuaXM=&q=bXVuaWNpcGlvX2FndWFfZXNnb3Rv&d=dHJ1ZQ==&s=ZnJlZQ=="
)

MAPEAMENTO = [
    (
        "extensao_rede_agua",
        "agua_extensao_rede",
        "AG005 - Extensao da rede de agua",
    ),
    (
        "extensao_rede_esgoto",
        "esgoto_extensao_rede",
        "ES004 - Extensao da rede de esgotos",
    ),
    (
        "indice_consumo_agua_per_capita",
        "agua_consumo_per_capita",
        "IN022_AE - Consumo medio per capita de agua",
    ),
    (
        "indice_atendimento_total_agua",
        "agua_atendimento_total",
        "IN055_AE - Indice de atendimento total de agua",
    ),
    (
        "indice_atendimento_urbano_agua",
        "agua_atendimento_urbano",
        "IN023_AE - Indice de atendimento urbano de agua",
    ),
    (
        "indice_perda_distribuicao_agua",
        "agua_perdas_distribuicao",
        "IN049_AE - Indice de perdas na distribuicao",
    ),
    (
        "indice_atendimento_esgoto_agua",
        "esgoto_atendimento_total",
        "IN056_AE - Indice de atendimento total de esgoto referido aos municipios atendidos com agua",
    ),
    (
        "indice_atendimento_agua_esgoto",
        "esgoto_atendimento_urbano",
        "IN024_AE - Indice de atendimento urbano de esgoto referido aos municipios atendidos com agua",
    ),
    (
        "indice_coleta_esgoto",
        "esgoto_coleta",
        "IN015_AE - Indice de coleta de esgoto",
    ),
    (
        "indice_tratamento_esgoto",
        "esgoto_tratamento",
        "IN016_AE - Indice de tratamento de esgoto",
    ),
]


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


def _criar_fonte(db: Session, anos: list[int]) -> models.FonteDados:
    fonte = models.FonteDados(
        nome=FONTE_NOME,
        origem=FONTE_ORIGEM,
        ano_referencia=max(anos) if anos else None,
        url_origem=URL_ORIGEM,
        nome_arquivo=ARQUIVO_CSV,
        observacoes=(
            "Serie historica municipal de Agua e Esgoto do SNIS, baixada em CSV aberto "
            "pela Base dos Dados a partir da fonte oficial."
        ),
    )
    db.add(fonte)
    db.flush()
    return fonte


def _registrar_valor(
    db: Session,
    municipio: models.Municipio,
    indicador: models.Indicador,
    fonte: models.FonteDados,
    ano: int,
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
            ano=ano,
            valor=valor,
            fonte_dados_id=fonte.id,
            status_validacao="oficial_snis",
            observacoes=observacoes,
        )
    )
    return True


def _ler_csv_historico(arquivo: Path) -> pd.DataFrame:
    colunas = ["ano", "id_municipio", "sigla_uf", *[coluna for coluna, _, _ in MAPEAMENTO]]
    df = pd.read_csv(
        arquivo,
        compression="gzip",
        usecols=colunas,
        dtype={"id_municipio": str, "sigla_uf": str},
        low_memory=False,
    )
    df = df[df["sigla_uf"].eq("MS")].copy()
    df["ano"] = pd.to_numeric(df["ano"], errors="coerce")
    df = df[df["ano"].notna()]
    df["ano"] = df["ano"].astype(int)
    return df


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
        order by vi.ano desc, m.nome, i.tema, i.nome
    """
    df = pd.read_sql_query(text(query), db.connection(), params={"fonte_id": fonte_id})
    saida = DATA_DIR / "processed" / "snis_historico_1995_2022_ms_agua_esgoto_tratado.csv"
    saida.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(saida, index=False, encoding="utf-8-sig")


def main() -> None:
    arquivo = DATA_DIR / "raw" / ARQUIVO_CSV
    if not arquivo.exists():
        raise SystemExit(
            f"Arquivo ausente em {arquivo}. Baixe a tabela com: curl -L '{DOWNLOAD_URL}' -o {arquivo}"
        )

    df = _ler_csv_historico(arquivo)

    init_db()
    with SessionLocal() as db:
        seed_all(db)
        _limpar_importacao_anterior(db)

        anos = sorted(df["ano"].dropna().astype(int).unique().tolist())
        fonte = _criar_fonte(db, anos)
        municipios = _obter_municipios(db)
        indicadores = _obter_indicadores(db)

        importados = 0
        erros = 0
        avisos: list[str] = []

        for _, row in df.iterrows():
            codigo_ibge = str(row["id_municipio"]).strip().zfill(7)
            municipio = municipios.get(codigo_ibge)
            if not municipio:
                erros += 1
                avisos.append(f"municipio MS nao cadastrado: {codigo_ibge}")
                continue

            ano = int(row["ano"])
            for coluna, indicador_codigo, descricao in MAPEAMENTO:
                indicador = indicadores[indicador_codigo]
                ok = _registrar_valor(
                    db,
                    municipio,
                    indicador,
                    fonte,
                    ano,
                    row[coluna],
                    f"SNIS Serie Historica Agua/Esgoto: {descricao}",
                )
                importados += int(ok)
                erros += int(not ok)

        db.add(
            models.LogImportacao(
                arquivo=ARQUIVO_CSV,
                fonte=FONTE_NOME,
                ano_referencia=max(anos) if anos else None,
                total_linhas=importados + erros,
                linhas_importadas=importados,
                linhas_com_erro=erros,
                mensagem="; ".join(avisos[:30]) if avisos else "Importacao SNIS historico concluida.",
            )
        )
        db.commit()
        _salvar_resumo_processado(db, fonte.id)

    print(f"SNIS historico: {importados} valores importados, {erros} ausentes/ignorados.")
    print(f"Anos importados: {min(anos)}-{max(anos)}; municipios MS no CSV: {df['id_municipio'].nunique()}.")
    for aviso in avisos[:10]:
        print(f"aviso: {aviso}")


if __name__ == "__main__":
    main()
