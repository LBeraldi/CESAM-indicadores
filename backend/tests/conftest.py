import os
from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("AUTO_INIT_DB", "false")
os.environ.setdefault("RATE_LIMIT_PER_MINUTE", "1000")
os.environ["CORS_ORIGINS"] = "http://localhost:3000,http://localhost:3002"
os.environ.pop("CORS_ORIGIN_REGEX", None)

from app.database import engine, get_db
from app.main import app
from app.models import FonteDados, Indicador, Municipio, ValorIndicador


@pytest.fixture
def db_session() -> Session:
    """Isola cada teste em uma transacao revertida ao final."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, expire_on_commit=False)
    try:
        yield session
    finally:
        session.close()
        if transaction.is_active:
            transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session: Session) -> TestClient:
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def sample_data(db_session: Session) -> dict[str, object]:
    fonte = FonteDados(nome="Fonte automatizada de teste", origem="pytest", ano_referencia=2023)
    maior = Indicador(
        codigo="teste_atendimento_total",
        nome="Atendimento total de teste",
        tema="Agua Teste",
        unidade="%",
        sentido="maior_melhor",
    )
    menor = Indicador(
        codigo="teste_perdas",
        nome="Perdas de teste",
        tema="Agua Teste",
        unidade="%",
        sentido="menor_melhor",
    )
    alfa = Municipio(
        codigo_ibge="5099991", nome="Municipio Teste Alfa", uf="MS", populacao=12000, area_km2=250.5
    )
    beta = Municipio(
        codigo_ibge="5099992", nome="Municipio Teste Beta", uf="MS", populacao=8000, area_km2=180.0
    )
    db_session.add_all([fonte, maior, menor, alfa, beta])
    db_session.flush()
    valores = [
        ValorIndicador(municipio=alfa, indicador=maior, fonte_dados=fonte, ano=2022, valor=80.0, status_validacao="oficial_teste"),
        ValorIndicador(municipio=alfa, indicador=maior, fonte_dados=fonte, ano=2023, valor=92.0, status_validacao="oficial_teste"),
        ValorIndicador(municipio=beta, indicador=maior, fonte_dados=fonte, ano=2023, valor=75.0, status_validacao="oficial_teste"),
        ValorIndicador(municipio=alfa, indicador=menor, fonte_dados=fonte, ano=2023, valor=30.0, status_validacao="oficial_teste"),
        ValorIndicador(municipio=beta, indicador=menor, fonte_dados=fonte, ano=2023, valor=20.0, status_validacao="oficial_teste"),
    ]
    db_session.add_all(valores)
    db_session.flush()
    return {"fonte": fonte, "maior": maior, "menor": menor, "alfa": alfa, "beta": beta, "valores": valores}
