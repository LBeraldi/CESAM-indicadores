from dataclasses import dataclass, field
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.services.normalizacao import (
    codigo_indicador,
    detectar_colunas_base,
    detectar_colunas_indicadores,
    nome_legivel,
    normalizar_codigo_ibge,
    normalizar_dataframe,
    normalizar_nome_municipio,
)
from app.services.validacao import converter_ano, converter_valor

EXTENSOES_SUPORTADAS = {".csv", ".xlsx", ".xls"}


@dataclass
class ResultadoImportacao:
    arquivo: str
    total_linhas: int = 0
    linhas_importadas: int = 0
    linhas_com_erro: int = 0
    avisos: list[str] = field(default_factory=list)


def listar_arquivos(caminho: Path) -> list[Path]:
    if caminho.is_file():
        return [caminho]
    arquivos: list[Path] = []
    for extensao in [*EXTENSOES_SUPORTADAS, ".zip"]:
        arquivos.extend(caminho.rglob(f"*{extensao}"))
    return sorted(arquivos)


def ler_arquivo(arquivo: Path) -> pd.DataFrame:
    if arquivo.suffix.lower() == ".csv":
        for encoding in ("utf-8-sig", "utf-8", "latin1"):
            try:
                return pd.read_csv(arquivo, sep=None, engine="python", encoding=encoding)
            except UnicodeDecodeError:
                continue
        return pd.read_csv(arquivo, sep=None, engine="python", encoding="latin1")
    if arquivo.suffix.lower() in {".xlsx", ".xls"}:
        return pd.read_excel(arquivo)
    raise ValueError(f"Extensao nao suportada: {arquivo.suffix}")


def _municipios_por_codigo(db: Session) -> dict[str, models.Municipio]:
    municipios = db.scalars(select(models.Municipio)).all()
    return {municipio.codigo_ibge: municipio for municipio in municipios}


def _municipios_por_nome(db: Session) -> dict[str, models.Municipio]:
    municipios = db.scalars(select(models.Municipio).where(models.Municipio.uf == "MS")).all()
    return {normalizar_nome_municipio(municipio.nome): municipio for municipio in municipios}


def _obter_ou_criar_indicador(db: Session, coluna: str, fonte: str) -> models.Indicador:
    codigo = codigo_indicador(coluna)
    indicador = db.scalar(select(models.Indicador).where(models.Indicador.codigo == codigo))
    if indicador:
        return indicador

    indicador = models.Indicador(
        codigo=codigo,
        nome=nome_legivel(coluna),
        tema="Importado",
        descricao="Indicador criado automaticamente pelo importador generico.",
        unidade=None,
        fonte=fonte,
    )
    db.add(indicador)
    db.flush()
    return indicador


def _registrar_log(db: Session, resultado: ResultadoImportacao, fonte: str, ano: int | None) -> None:
    mensagem = "; ".join(resultado.avisos[:30])
    if len(resultado.avisos) > 30:
        mensagem += f"; +{len(resultado.avisos) - 30} avisos adicionais"
    db.add(
        models.LogImportacao(
            arquivo=resultado.arquivo,
            fonte=fonte,
            ano_referencia=ano,
            total_linhas=resultado.total_linhas,
            linhas_importadas=resultado.linhas_importadas,
            linhas_com_erro=resultado.linhas_com_erro,
            mensagem=mensagem or "Importacao concluida.",
        )
    )


def processar_arquivo(
    db: Session,
    arquivo: Path,
    fonte: str,
    ano_referencia: int | None,
    diretorio_processado: Path,
) -> ResultadoImportacao:
    resultado = ResultadoImportacao(arquivo=str(arquivo))
    df_original = ler_arquivo(arquivo)
    resultado.total_linhas = len(df_original)

    if df_original.empty:
        resultado.avisos.append("arquivo vazio")
        _registrar_log(db, resultado, fonte, ano_referencia)
        db.commit()
        return resultado

    df, _ = normalizar_dataframe(df_original)
    colunas_base = detectar_colunas_base(df)
    codigo_col = colunas_base["codigo_ibge"]
    municipio_col = colunas_base["municipio"]
    uf_col = colunas_base["uf"]
    ano_col = colunas_base["ano"]

    if uf_col:
        df = df[df[uf_col].astype(str).str.upper().str.strip().eq("MS")]
    elif codigo_col:
        df = df[df[codigo_col].apply(lambda value: (normalizar_codigo_ibge(value) or "").startswith("50"))]
    else:
        resultado.avisos.append("nao foi possivel identificar UF ou codigo IBGE para filtrar Mato Grosso do Sul")

    municipios_codigo = _municipios_por_codigo(db)
    municipios_nome = _municipios_por_nome(db)
    indicadores_cols = detectar_colunas_indicadores(df, colunas_base)

    if not indicadores_cols:
        resultado.avisos.append("nenhuma coluna de indicador foi identificada")

    fonte_dados = models.FonteDados(
        nome=fonte,
        origem=fonte,
        ano_referencia=ano_referencia,
        nome_arquivo=arquivo.name,
        observacoes="Arquivo importado manualmente a partir de data/raw.",
    )
    db.add(fonte_dados)
    db.flush()

    for indice, row in df.iterrows():
        codigo = normalizar_codigo_ibge(row[codigo_col]) if codigo_col else None
        municipio = municipios_codigo.get(codigo) if codigo else None

        if not municipio and municipio_col:
            municipio = municipios_nome.get(normalizar_nome_municipio(row[municipio_col]))

        if not municipio:
            resultado.linhas_com_erro += 1
            resultado.avisos.append(f"linha {indice + 2}: municipio sem codigo IBGE reconhecido")
            continue

        ano = converter_ano(row[ano_col], ano_referencia) if ano_col else ano_referencia
        if not ano:
            resultado.linhas_com_erro += 1
            resultado.avisos.append(f"linha {indice + 2}: ano ausente")
            continue

        importou_algum_valor = False
        for coluna in indicadores_cols:
            valor, erro = converter_valor(row[coluna])
            if erro:
                resultado.avisos.append(f"linha {indice + 2}, coluna {coluna}: {erro}")
                continue

            indicador = _obter_ou_criar_indicador(db, coluna, fonte)
            existente = db.scalar(
                select(models.ValorIndicador).where(
                    models.ValorIndicador.municipio_id == municipio.id,
                    models.ValorIndicador.indicador_id == indicador.id,
                    models.ValorIndicador.ano == ano,
                    models.ValorIndicador.fonte_dados_id == fonte_dados.id,
                )
            )
            if existente:
                existente.valor = valor
                existente.status_validacao = "pendente"
            else:
                db.add(
                    models.ValorIndicador(
                        municipio_id=municipio.id,
                        indicador_id=indicador.id,
                        ano=ano,
                        valor=valor,
                        fonte_dados_id=fonte_dados.id,
                        status_validacao="pendente",
                    )
                )
            importou_algum_valor = True

        if importou_algum_valor:
            resultado.linhas_importadas += 1
        else:
            resultado.linhas_com_erro += 1

    diretorio_processado.mkdir(parents=True, exist_ok=True)
    saida = diretorio_processado / f"{arquivo.stem}_{fonte.lower()}_{ano_referencia or 'sem_ano'}_tratado.csv"
    df.to_csv(saida, index=False, encoding="utf-8-sig")

    _registrar_log(db, resultado, fonte, ano_referencia)
    db.commit()
    return resultado


def processar_zip(
    db: Session,
    arquivo_zip: Path,
    fonte: str,
    ano_referencia: int | None,
    diretorio_processado: Path,
) -> list[ResultadoImportacao]:
    resultados: list[ResultadoImportacao] = []
    with TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        with ZipFile(arquivo_zip) as zip_file:
            destino = temp_path.resolve()
            for membro in zip_file.infolist():
                caminho_membro = (temp_path / membro.filename).resolve()
                if not str(caminho_membro).startswith(str(destino)):
                    raise ValueError(f"Arquivo ZIP contem caminho inseguro: {membro.filename}")
            zip_file.extractall(temp_path)
        for arquivo in listar_arquivos(temp_path):
            if arquivo.suffix.lower() in EXTENSOES_SUPORTADAS:
                resultados.append(processar_arquivo(db, arquivo, fonte, ano_referencia, diretorio_processado))
    if not resultados:
        resultado = ResultadoImportacao(arquivo=str(arquivo_zip), avisos=["zip sem arquivos suportados"])
        _registrar_log(db, resultado, fonte, ano_referencia)
        db.commit()
        resultados.append(resultado)
    return resultados
