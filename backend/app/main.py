import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app import models, schemas
from app.api.routes_indicadores import router as indicadores_router
from app.api.routes_municipios import router as municipios_router
from app.database import SessionLocal, engine, init_db
from app.seed import seed_all


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def _auto_init_db() -> bool:
    default = "false" if os.getenv("VERCEL") else "true"
    return os.getenv("AUTO_INIT_DB", default).strip().lower() in {"1", "true", "yes", "sim"}


app = FastAPI(
    title="Observatório de Saneamento API",
    description="API inicial de indicadores municipais de saneamento e infraestrutura de Mato Grosso do Sul.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=os.getenv(
        "CORS_ORIGIN_REGEX",
        r"https://.*\.vercel\.app" if os.getenv("VERCEL") else None,
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(municipios_router)
app.include_router(indicadores_router)


@app.on_event("startup")
def startup() -> None:
    # O banco publicado já é migrado e carregado antes do deploy. Não faça
    # DDL/seed em cada nova instância de uma função serverless.
    if not _auto_init_db():
        return
    init_db()
    with SessionLocal() as db:
        seed_all(db)


@app.get("/health", response_model=schemas.HealthResponse)
def health() -> schemas.HealthResponse:
    database_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        database_status = "erro"

    return schemas.HealthResponse(status="ok", service="observatorio-saneamento-api", database=database_status)
