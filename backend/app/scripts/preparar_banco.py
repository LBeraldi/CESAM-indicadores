"""Prepara o banco antes de iniciar a API, fora dos workers HTTP."""

import argparse

from app.database import SessionLocal
from app.scripts.migrar import main as migrar
from app.seed import seed_all


def main() -> None:
    parser = argparse.ArgumentParser(description="Aplica migrations e dados-base idempotentes.")
    parser.add_argument("--seed", action="store_true", help="Cadastra municípios e indicadores básicos.")
    args = parser.parse_args()

    migrar()
    if args.seed:
        with SessionLocal() as db:
            seed_all(db)


if __name__ == "__main__":
    main()
