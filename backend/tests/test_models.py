import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import FonteDados, Indicador, Municipio, ValorIndicador
from app.schemas import IndicadorRead, MunicipioRead


def test_defaults_relacionamentos_e_schemas(db_session: Session) -> None:
    municipio = Municipio(codigo_ibge="5099980", nome="Modelo Teste", uf="MS")
    indicador = Indicador(codigo="modelo_teste", nome="Indicador Modelo", tema="Teste")
    fonte = FonteDados(nome="Fonte Modelo")
    valor = ValorIndicador(municipio=municipio, indicador=indicador, fonte_dados=fonte, ano=2023, valor=12.5)
    db_session.add(valor)
    db_session.flush()

    assert municipio.valores == [valor]
    assert indicador.valores == [valor]
    assert fonte.valores == [valor]
    assert indicador.sentido == "maior_melhor"
    assert valor.status_validacao == "pendente"
    assert MunicipioRead.model_validate(municipio).codigo_ibge == "5099980"
    assert IndicadorRead.model_validate(indicador).sentido == "maior_melhor"


@pytest.mark.parametrize(
    ("primeiro", "duplicado"),
    [
        (Municipio(codigo_ibge="5099981", nome="Original", uf="MS"), Municipio(codigo_ibge="5099981", nome="Duplicado", uf="MS")),
        (Indicador(codigo="codigo_unico_teste", nome="Original", tema="Teste"), Indicador(codigo="codigo_unico_teste", nome="Duplicado", tema="Teste")),
    ],
)
def test_campos_de_negocio_sao_unicos(db_session: Session, primeiro: object, duplicado: object) -> None:
    db_session.add(primeiro)
    db_session.flush()
    with pytest.raises(IntegrityError):
        with db_session.begin_nested():
            db_session.add(duplicado)
            db_session.flush()


def test_valor_nao_duplica_mesma_chave_de_importacao(db_session: Session) -> None:
    municipio = Municipio(codigo_ibge="5099982", nome="Unicidade Valor", uf="MS")
    indicador = Indicador(codigo="unicidade_valor", nome="Unicidade", tema="Teste")
    fonte = FonteDados(nome="Fonte Unicidade")
    db_session.add_all([municipio, indicador, fonte])
    db_session.flush()
    db_session.add(ValorIndicador(municipio=municipio, indicador=indicador, fonte_dados=fonte, ano=2023, valor=10))
    db_session.flush()

    with pytest.raises(IntegrityError):
        with db_session.begin_nested():
            db_session.add(ValorIndicador(municipio=municipio, indicador=indicador, fonte_dados=fonte, ano=2023, valor=20))
            db_session.flush()
