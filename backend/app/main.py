from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from sqlalchemy import text

from app import models, schemas
from app.api.routes_indicadores import router as indicadores_router
from app.api.routes_municipios import router as municipios_router
from app.database import SessionLocal, engine, init_db
from app.middleware import observability_middleware
from app.seed import seed_all


def _cors_origins() -> list[str]:
    default = (
        "https://observatorio-saneamento-ms.vercel.app"
        if os.getenv("VERCEL")
        else "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002,http://127.0.0.1:3002"
    )
    raw = os.getenv("CORS_ORIGINS", default)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def _auto_init_db() -> bool:
    default = "false" if os.getenv("VERCEL") else "true"
    return os.getenv("AUTO_INIT_DB", default).strip().lower() in {"1", "true", "yes", "sim"}


def _run_migrations() -> bool:
    return os.getenv("RUN_DB_MIGRATIONS", "false").strip().lower() in {"1", "true", "yes", "sim"}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if _run_migrations():
        from app.scripts.migrar import main as migrar

        migrar()
    if _auto_init_db():
        init_db()
        with SessionLocal() as db:
            seed_all(db)
    yield


app = FastAPI(
    title="Observatório de Saneamento API",
    description="API inicial de indicadores municipais de saneamento e infraestrutura de Mato Grosso do Sul.",
    version="0.1.0",
    lifespan=lifespan,
)

app.middleware("http")(observability_middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=os.getenv("CORS_ORIGIN_REGEX") or None,
    allow_credentials=False,
    allow_methods=["GET", "HEAD", "OPTIONS"],
    allow_headers=["Accept", "Content-Type", "X-Request-ID"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=6)

app.include_router(municipios_router)
app.include_router(indicadores_router)


@app.get("/health", response_model=schemas.HealthResponse)
def health() -> schemas.HealthResponse:
    database_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        database_status = "erro"

    return schemas.HealthResponse(status="ok", service="observatorio-saneamento-api", database=database_status)
