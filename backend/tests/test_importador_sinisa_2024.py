from pathlib import Path
from zipfile import ZipFile

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.scripts import importar_sinisa_2024 as sinisa


def adicionar_indicadores(db: Session, codigos: list[str]) -> dict[str, models.Indicador]:
    indicadores: dict[str, models.Indicador] = {}
    for codigo in codigos:
        indicador = db.scalar(select(models.Indicador).where(models.Indicador.codigo == codigo))
        if indicador is None:
            indicador = models.Indicador(codigo=codigo, nome=codigo, tema="Tema de teste", unidade="%")
            db.add(indicador)
        indicadores[codigo] = indicador
    db.flush()
    return indicadores


def criar_fonte(db: Session) -> models.FonteDados:
    fonte = models.FonteDados(nome="SINISA 2024 - Teste", ano_referencia=2024)
    db.add(fonte)
    db.flush()
    return fonte


def test_normaliza_codigo_e_valores_compostos() -> None:
    assert sinisa._normalizar_codigo("5099991.0") == "5099991"
    assert sinisa._normalizar_codigo(5099991) == "5099991"
    linha = pd.Series({"A": "não", "B": "sim", "C": None})
    assert sinisa._valor_composto(linha, ("A", "B", "C")) == 1.0
    assert sinisa._valor_composto(linha, ("C",)) is None


def test_importa_planilha_de_indicadores_apenas_para_municipios_de_ms(
    db_session: Session, sample_data: dict[str, object], monkeypatch
) -> None:
    alfa = sample_data["alfa"]
    assert isinstance(alfa, models.Municipio)
    indicadores = adicionar_indicadores(db_session, ["teste_agua"])
    fonte = criar_fonte(db_session)
    dados = pd.DataFrame(
        {
            "cod_IBGE": [alfa.codigo_ibge, "5099993"],
            "UF": ["MS", "SP"],
            "COLUNA_AGUA": [92.5, 10.0],
        }
    )
    monkeypatch.setattr(sinisa.pd, "read_excel", lambda *args, **kwargs: dados)

    resultado = sinisa._importar_planilha_codigos(
        db_session,
        Path("agua.xlsx"),
        [("teste_agua", "COLUNA_AGUA", "Atendimento de teste")],
        fonte,
        {alfa.codigo_ibge: alfa},
        indicadores,
        "Água",
        11,
        "cod_IBGE",
    )
    db_session.flush()

    assert resultado == (1, 0, [])
    valor = db_session.scalar(
        select(models.ValorIndicador).where(models.ValorIndicador.indicador_id == indicadores["teste_agua"].id)
    )
    assert valor is not None
    assert valor.valor == 92.5
    assert valor.ano == 2024
    assert valor.status_validacao == "oficial_sinisa"


def test_importa_todos_os_indicadores_codificados_e_cadastra_os_novos(
    db_session: Session, sample_data: dict[str, object], monkeypatch
) -> None:
    alfa = sample_data["alfa"]
    assert isinstance(alfa, models.Municipio)
    fonte = criar_fonte(db_session)
    dados = pd.DataFrame({"cod_IBGE": [alfa.codigo_ibge], "UF": ["MS"], "IAG9999": [73.5]})
    cabecalho = pd.DataFrame([[None, None, None] for _ in range(12)])
    cabecalho.iloc[9] = ["Código", "UF", "Atendimento rural"]
    cabecalho.iloc[10] = ["cod_IBGE", "UF", "Percentual"]
    cabecalho.iloc[11] = ["cod_IBGE", "UF", "IAG9999"]

    def read_excel(*_args, **kwargs):
        return cabecalho if kwargs.get("header") is None else dados

    monkeypatch.setattr(sinisa.pd, "read_excel", read_excel)

    resultado = sinisa._importar_todos_indicadores_codificados(
        db_session,
        Path("agua.xlsx"),
        fonte,
        {alfa.codigo_ibge: alfa},
        {},
        "Água",
        0,
        11,
        9,
        10,
        "cod_IBGE",
        ("IAG",),
    )
    db_session.flush()

    assert resultado == (1, 0, [])
    indicador = db_session.scalar(select(models.Indicador).where(models.Indicador.codigo == "IAG9999"))
    assert indicador is not None
    assert indicador.nome == "Atendimento rural"
    assert indicador.unidade == "Percentual"


def test_importa_os_quatro_indicadores_de_residuos(
    db_session: Session, sample_data: dict[str, object], monkeypatch
) -> None:
    alfa = sample_data["alfa"]
    assert isinstance(alfa, models.Municipio)
    codigos = [codigo for codigo, _coluna in sinisa.MAPEAMENTO_RESIDUOS]
    indicadores = adicionar_indicadores(db_session, codigos)
    fonte = criar_fonte(db_session)
    dados = pd.DataFrame(
        {
            "CÓDIGO DO IBGE": [alfa.codigo_ibge],
            "UF": ["MS"],
            **{coluna: [indice + 1] for indice, (_codigo, coluna) in enumerate(sinisa.MAPEAMENTO_RESIDUOS)},
        }
    )
    monkeypatch.setattr(sinisa.pd, "read_excel", lambda *args, **kwargs: dados)

    resultado = sinisa._importar_residuos(
        db_session, Path("residuos.xlsx"), fonte, {alfa.codigo_ibge: alfa}, indicadores
    )
    db_session.flush()

    valores = db_session.scalars(
        select(models.ValorIndicador).where(models.ValorIndicador.fonte_dados_id == fonte.id)
    ).all()
    assert resultado == (4, 0, [])
    assert {valor.indicador.codigo for valor in valores} == set(codigos)
    assert {valor.valor for valor in valores} == {1.0, 2.0, 3.0, 4.0}


def test_importa_os_quatro_indicadores_de_aguas_pluviais(
    db_session: Session, sample_data: dict[str, object], monkeypatch
) -> None:
    alfa = sample_data["alfa"]
    assert isinstance(alfa, models.Municipio)
    codigos = [codigo for codigo, _indice, _descricao in sinisa.MAPEAMENTO_AGUAS_PLUVIAIS]
    indicadores = adicionar_indicadores(db_session, codigos)
    fonte = criar_fonte(db_session)
    colunas = [f"coluna_{indice}" for indice in range(35)]
    colunas[0], colunas[1] = "Código IBGE", "UF"
    linha = [None] * len(colunas)
    linha[0], linha[1] = alfa.codigo_ibge, "MS"
    for indice, valor in zip((24, 25, 33, 34), (24.0, 25.0, 33.0, 34.0), strict=True):
        linha[indice] = valor
    dados = pd.DataFrame([linha], columns=colunas)
    monkeypatch.setattr(sinisa.pd, "read_excel", lambda *args, **kwargs: dados)

    resultado = sinisa._importar_aguas_pluviais(
        db_session, Path("pluviais.xlsx"), fonte, {alfa.codigo_ibge: alfa}, indicadores
    )
    db_session.flush()

    valores = db_session.scalars(
        select(models.ValorIndicador).where(models.ValorIndicador.fonte_dados_id == fonte.id)
    ).all()
    assert resultado == (4, 0, [])
    assert {valor.indicador.codigo for valor in valores} == set(codigos)
    assert {valor.valor for valor in valores} == {24.0, 25.0, 33.0, 34.0}


def test_importa_gestao_e_compoe_campos_alternativos(
    db_session: Session, sample_data: dict[str, object], monkeypatch
) -> None:
    alfa = sample_data["alfa"]
    assert isinstance(alfa, models.Municipio)
    codigos = list(sinisa.MAPEAMENTO_GESTAO)
    indicadores = adicionar_indicadores(db_session, codigos)
    fonte = criar_fonte(db_session)
    dados = pd.DataFrame(
        {
            "Cod_IBGE": [alfa.codigo_ibge],
            "UF": ["MS"],
            "OGM3004*": ["sim"],
            "OGM3201*": ["não"],
            "OGM3204*": ["sim"],
            "OGM2001*": ["não"],
            "OGM2101*": ["não"],
            "OGM2201*": ["sim"],
            "OGM2301*": ["não"],
        }
    )
    monkeypatch.setattr(sinisa.pd, "read_excel", lambda *args, **kwargs: dados)

    resultado = sinisa._importar_gestao(
        db_session, Path("gestao.xlsx"), fonte, {alfa.codigo_ibge: alfa}, indicadores
    )
    db_session.flush()

    valores = db_session.scalars(
        select(models.ValorIndicador).where(models.ValorIndicador.fonte_dados_id == fonte.id)
    ).all()
    por_codigo = {valor.indicador.codigo: valor.valor for valor in valores}
    assert resultado == (3, 0, [])
    assert por_codigo == {
        "gestao_plano_municipal_saneamento": 1.0,
        "gestao_conselho_municipal": 1.0,
        "gestao_agencia_reguladora": 1.0,
    }


def test_extrai_planilha_de_aguas_pluviais_do_zip(tmp_path: Path) -> None:
    arquivo_zip = tmp_path / "pluviais.zip"
    destino = tmp_path / "extraido"
    destino.mkdir()
    with ZipFile(arquivo_zip, "w") as arquivo:
        arquivo.writestr("pasta/Indicadores_AP2024.xlsx", b"conteudo de teste")

    resultado = sinisa._extrair_indicadores_pluviais(arquivo_zip, destino)

    assert resultado == destino / "Indicadores_AP2024.xlsx"
    assert resultado.read_bytes() == b"conteudo de teste"
