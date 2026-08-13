"""Popula apenas os dados determinísticos necessários aos testes E2E do CI."""

from sqlalchemy import select

from app.database import SessionLocal
from app.models import FonteDados, Indicador, Municipio, ValorIndicador
from app.seed import INDICADORES_INICIAIS, seed_all


def main() -> None:
    with SessionLocal() as db:
        seed_all(db)
        fonte = FonteDados(nome="SINISA E2E", origem="fixture-ci", ano_referencia=2023)
        db.add(fonte)

        municipios = {
            codigo: db.scalar(select(Municipio).where(Municipio.codigo_ibge == codigo))
            for codigo in ("5003702", "5004007")
        }
        dourados = municipios["5003702"]
        gloria = municipios["5004007"]
        if not dourados or not gloria:
            raise RuntimeError("A fixture municipal de seed_all não foi carregada.")
        dourados.populacao, dourados.area_km2 = 264_017, 4_086.2
        gloria.populacao, gloria.area_km2 = 10_817, 491.0

        indicadores = {
            item.codigo: item for item in db.scalars(select(Indicador)).all()
        }
        for indice, (codigo, *_resto) in enumerate(INDICADORES_INICIAIS):
            indicador = indicadores[codigo]
            for municipio, deslocamento in ((dourados, 0), (gloria, -8)):
                valor_base = max(1.0, 80.0 + deslocamento - (indice % 7))
                db.add_all(
                    [
                        ValorIndicador(
                            municipio=municipio,
                            indicador=indicador,
                            fonte_dados=fonte,
                            ano=2022,
                            valor=valor_base - 2,
                            status_validacao="oficial_sinisa",
                        ),
                        ValorIndicador(
                            municipio=municipio,
                            indicador=indicador,
                            fonte_dados=fonte,
                            ano=2023,
                            valor=valor_base,
                            status_validacao="oficial_sinisa",
                        ),
                    ]
                )
        db.commit()


if __name__ == "__main__":
    main()
