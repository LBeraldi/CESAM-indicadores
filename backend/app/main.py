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


app = FastAPI(
    title="infra-ms API",
    description="API inicial de indicadores municipais de saneamento e infraestrutura de Mato Grosso do Sul.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(municipios_router)
app.include_router(indicadores_router)


@app.on_event("startup")
def startup() -> None:
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

    return schemas.HealthResponse(status="ok", service="infra-ms-api", database=database_status)
