from fastapi.testclient import TestClient


def test_health_and_security_headers(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "observatorio-saneamento-api", "database": "ok"}
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-request-id"]
    assert response.headers["cache-control"] == "no-store"


def test_public_get_is_cacheable(client: TestClient) -> None:
    response = client.get("/municipios")
    assert response.status_code == 200
    assert response.headers["vercel-cdn-cache-control"].startswith("public, s-maxage=3600")


def test_cors_accepts_local_frontend_and_rejects_unknown_origin(client: TestClient) -> None:
    allowed = client.options(
        "/municipios",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"},
    )
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"

    denied = client.options(
        "/municipios",
        headers={"Origin": "https://site-malicioso.vercel.app", "Access-Control-Request-Method": "GET"},
    )
    assert denied.status_code == 400
    assert "access-control-allow-origin" not in denied.headers


def test_lista_e_detalhe_de_municipios(client: TestClient, sample_data: dict[str, object]) -> None:
    lista = client.get("/municipios")
    assert lista.status_code == 200
    encontrados = [item for item in lista.json() if item["codigo_ibge"].startswith("509999")]
    assert [item["nome"] for item in encontrados] == ["Municipio Teste Alfa", "Municipio Teste Beta"]

    detalhe = client.get("/municipios/5099991")
    assert detalhe.status_code == 200
    assert detalhe.json()["populacao"] == 12000
    assert detalhe.json()["area_km2"] == 250.5

    assert client.get("/municipios/0000000").status_code == 404


def test_indicadores_por_municipio_e_filtro_de_ano(client: TestClient, sample_data: dict[str, object]) -> None:
    todos = client.get("/municipios/5099991/indicadores")
    assert todos.status_code == 200
    assert len(todos.json()["indicadores"]) == 3

    ano = client.get("/municipios/5099991/indicadores?ano=2022")
    assert ano.status_code == 200
    assert [item["valor"] for item in ano.json()["indicadores"]] == [80.0]
    assert ano.json()["indicadores"][0]["fonte"] == "Fonte automatizada de teste"

    assert client.get("/municipios/5099991/indicadores?ano=1800").status_code == 422
    assert client.get("/municipios/0000000/indicadores").status_code == 404


def test_dados_institucionais_do_municipio(client: TestClient, sample_data: dict[str, object]) -> None:
    response = client.get("/municipios/5099991/institucional")
    assert response.status_code == 200
    assert response.json()["atendimento_agua"]["prestador_nome"] == "Prestador Teste"
    assert response.json()["atendimento_agua"]["endereco"] == "Rua de Teste, 100"
    assert response.json()["recursos"] == [
        {
            "tipo": "plano_saneamento",
            "url": "https://example.com/plano.pdf",
            "direto": True,
            "fonte": None,
        }
    ]
    assert client.get("/municipios/0000000/institucional").status_code == 404


def test_catalogo_filtra_tema_com_slug_ou_texto(client: TestClient, sample_data: dict[str, object]) -> None:
    por_texto = client.get("/indicadores?tema=Agua%20Teste")
    por_slug = client.get("/indicadores?tema=agua-teste")
    assert por_texto.status_code == por_slug.status_code == 200
    assert {item["codigo"] for item in por_texto.json()} == {"teste_atendimento_total", "teste_perdas"}
    assert {item["codigo"] for item in por_slug.json()} == {"teste_atendimento_total", "teste_perdas"}


def test_ranking_respeita_sentido_limite_e_validacao(client: TestClient, sample_data: dict[str, object]) -> None:
    maior = client.get("/ranking?indicador=teste_atendimento_total&ano=2023&limit=1")
    assert maior.status_code == 200
    assert [(item["municipio"], item["valor"]) for item in maior.json()] == [("Municipio Teste Alfa", 92.0)]

    menor = client.get("/ranking?indicador=teste_perdas&ano=2023")
    assert [(item["municipio"], item["valor"]) for item in menor.json()] == [
        ("Municipio Teste Beta", 20.0),
        ("Municipio Teste Alfa", 30.0),
    ]
    assert client.get("/ranking?indicador=inexistente&ano=2023").status_code == 404
    assert client.get("/ranking?indicador=teste_perdas&ano=2023&limit=0").status_code == 422
    assert client.get("/ranking?indicador=teste_perdas&ano=2200").status_code == 422


def test_anos_disponiveis_e_ranking_consolidado(client: TestClient, sample_data: dict[str, object]) -> None:
    anos = client.get("/indicadores/teste_atendimento_total/anos")
    assert anos.status_code == 200
    assert anos.json() == [2023, 2022]

    consolidado = client.get("/ranking/saneamento?ano=2023")
    assert consolidado.status_code == 200
    assert isinstance(consolidado.json(), list)
    assert client.get("/ranking/saneamento?ano=1800").status_code == 422


def test_api_publica_e_somente_leitura(client: TestClient) -> None:
    assert client.post("/municipios", json={}).status_code == 405
    assert client.put("/indicadores", json={}).status_code == 405
