from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_and_security_headers() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-request-id"]
    assert response.headers["cache-control"] == "no-store"


def test_public_get_is_cacheable() -> None:
    response = client.get("/municipios")
    assert response.status_code == 200
    assert response.headers["vercel-cdn-cache-control"].startswith("public, s-maxage=3600")


def test_cors_accepts_local_frontend_and_rejects_unknown_origin() -> None:
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


def test_ranking_saneamento_endpoint() -> None:
    response = client.get("/ranking/saneamento?ano=2023")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
