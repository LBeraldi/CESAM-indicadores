import argparse

from sqlalchemy import select

from app import models
from app.database import SessionLocal
from app.services.ibge import buscar_metadados_municipios_ms


def atualizar(somente_ausentes: bool = False) -> tuple[int, int]:
    metadados_por_codigo = buscar_metadados_municipios_ms()
    atualizados = 0

    with SessionLocal() as db:
        municipios = list(db.scalars(select(models.Municipio).where(models.Municipio.uf == "MS")).all())
        for municipio in municipios:
            metadados = metadados_por_codigo.get(municipio.codigo_ibge)
            if not metadados:
                continue
            alterado = False
            if metadados.populacao is not None and (not somente_ausentes or municipio.populacao is None):
                if municipio.populacao != metadados.populacao:
                    municipio.populacao = metadados.populacao
                    alterado = True
            if metadados.area_km2 is not None and (not somente_ausentes or municipio.area_km2 is None):
                if municipio.area_km2 != metadados.area_km2:
                    municipio.area_km2 = metadados.area_km2
                    alterado = True
            if alterado:
                atualizados += 1
        db.commit()
        return len(municipios), atualizados


def main() -> None:
    parser = argparse.ArgumentParser(description="Atualiza população e área dos municípios em lote pelo IBGE.")
    parser.add_argument("--somente-ausentes", action="store_true")
    args = parser.parse_args()
    total, atualizados = atualizar(args.somente_ausentes)
    print(f"IBGE: {atualizados} de {total} municípios atualizados.")


if __name__ == "__main__":
    main()
