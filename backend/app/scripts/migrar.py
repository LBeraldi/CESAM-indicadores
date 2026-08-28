from pathlib import Path

from alembic.config import Config
from sqlalchemy import inspect, text

from alembic import command
from app.database import engine

BASE_LEGADA = "202607100001"
MIGRATION_LOCK_ID = 594_020_826


def main() -> None:
    config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    with engine.connect() as lock_connection:
        lock_connection.execute(text("SELECT pg_advisory_lock(:lock_id)"), {"lock_id": MIGRATION_LOCK_ID})
        try:
            tabelas = set(inspect(engine).get_table_names())

            # As primeiras versões locais criavam o schema com create_all. Quando as
            # tabelas de domínio existem sem alembic_version, adotamos esse schema sem
            # executar novamente os DDLs iniciais.
            if "municipios" in tabelas and "alembic_version" not in tabelas:
                command.stamp(config, BASE_LEGADA)

            command.upgrade(config, "head")
        finally:
            lock_connection.execute(text("SELECT pg_advisory_unlock(:lock_id)"), {"lock_id": MIGRATION_LOCK_ID})


if __name__ == "__main__":
    main()
