from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.database import engine


BASE_LEGADA = "202607100001"


def main() -> None:
    config = Config("alembic.ini")
    tabelas = set(inspect(engine).get_table_names())

    # As primeiras versões locais criavam o schema com create_all. Quando as
    # tabelas de domínio existem sem alembic_version, adotamos esse schema sem
    # executar novamente os DDLs iniciais.
    if "municipios" in tabelas and "alembic_version" not in tabelas:
        command.stamp(config, BASE_LEGADA)

    command.upgrade(config, "head")


if __name__ == "__main__":
    main()
