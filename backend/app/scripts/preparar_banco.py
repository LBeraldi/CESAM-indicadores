"""Prepara o banco antes de iniciar a API, fora dos workers HTTP."""

import argparse
from pathlib import Path

from sqlalchemy import select

from app import models
from app.database import SessionLocal
from app.scripts.migrar import main as migrar
from app.seed import DATA_DIR, seed_all


def _fonte_possui_dados(nome: str) -> bool:
    with SessionLocal() as db:
        return db.scalar(
            select(models.ValorIndicador.id)
            .join(models.ValorIndicador.fonte_dados)
            .where(models.FonteDados.nome == nome)
            .limit(1)
        ) is not None


def _importar_dados_locais() -> None:
    """Importa fontes presentes no volume sem tornar o boot dependente delas."""
    from app.scripts.importar_sinisa_2023 import ARQUIVOS_OBRIGATORIOS as SINISA_ARQUIVOS
    from app.scripts.importar_sinisa_2023 import FONTE_NOME as SINISA_FONTE_NOME
    from app.scripts.importar_sinisa_2023 import main as importar_sinisa
    from app.scripts.importar_snis_historico import ARQUIVO_CSV as SNIS_ARQUIVO
    from app.scripts.importar_snis_historico import FONTE_NOME as SNIS_FONTE_NOME
    from app.scripts.importar_snis_historico import main as importar_snis

    raw_dir = Path(DATA_DIR) / "raw"
    arquivos_sinisa = [raw_dir / nome for nome in SINISA_ARQUIVOS]
    if all(arquivo.exists() for arquivo in arquivos_sinisa):
        if _fonte_possui_dados(SINISA_FONTE_NOME):
            print("SINISA 2023 já está importado; mantendo dados existentes.")
        else:
            try:
                importar_sinisa()
            except Exception as erro:  # noqa: BLE001 - boot não pode depender de um import opcional
                print(f"SINISA 2023 não importado: falha na importação ({erro}).")
    else:
        faltantes = ", ".join(arquivo.name for arquivo in arquivos_sinisa if not arquivo.exists())
        print(f"SINISA 2023 não importado: arquivos ausentes ({faltantes}).")

    arquivo_snis = raw_dir / SNIS_ARQUIVO
    if arquivo_snis.exists():
        if _fonte_possui_dados(SNIS_FONTE_NOME):
            print("SNIS histórico já está importado; mantendo dados existentes.")
        else:
            try:
                importar_snis()
            except Exception as erro:  # noqa: BLE001 - boot não pode depender de um import opcional
                print(f"SNIS histórico não importado: falha na importação ({erro}).")
    else:
        print(f"SNIS histórico não importado: arquivo ausente ({arquivo_snis.name}).")


def main() -> None:
    parser = argparse.ArgumentParser(description="Aplica migrations e dados-base idempotentes.")
    parser.add_argument("--seed", action="store_true", help="Cadastra municípios e indicadores básicos.")
    parser.add_argument(
        "--importar-dados",
        action="store_true",
        help="Importa automaticamente os arquivos oficiais encontrados em DATA_DIR/raw.",
    )
    args = parser.parse_args()

    migrar()
    if args.seed:
        with SessionLocal() as db:
            seed_all(db)
    if args.importar_dados:
        _importar_dados_locais()


if __name__ == "__main__":
    main()
