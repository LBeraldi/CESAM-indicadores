from collections.abc import Generator
import os

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv


load_dotenv()


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://observatorio_saneamento:observatorio_saneamento@localhost:5432/observatorio_saneamento",
)

# O painel do Supabase fornece URLs com postgresql://. O projeto usa o
# driver psycopg 3, então explicitamos o driver sem obrigar o operador a
# editar a credencial copiada do painel.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

database_url = make_url(DATABASE_URL)
if "supabase" in (database_url.host or "") and "sslmode" not in database_url.query:
    database_url = database_url.update_query_dict({"sslmode": "require"})
DATABASE_URL = database_url.render_as_string(hide_password=False)

serverless = os.getenv("DB_POOL_MODE", "").lower() == "serverless" or bool(os.getenv("VERCEL"))
engine_options: dict = {
    "pool_pre_ping": True,
    # O Supavisor em modo transacional não suporta prepared statements.
    "connect_args": {"prepare_threshold": None, "connect_timeout": 10},
}
if serverless:
    # Cada invocação serverless devolve imediatamente a conexão ao
    # Supavisor, evitando pools ociosos em várias instâncias da função.
    engine_options["poolclass"] = NullPool

engine = create_engine(DATABASE_URL, **engine_options)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app import models  # noqa: F401

    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    Base.metadata.create_all(bind=engine)
