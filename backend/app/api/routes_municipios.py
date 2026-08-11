from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.database import get_db


router = APIRouter(tags=["municipios"])


def _valor_to_schema(valor: models.ValorIndicador) -> schemas.ValorIndicadorRead:
    return schemas.ValorIndicadorRead(
        id=valor.id,
        ano=valor.ano,
        valor=valor.valor,
        status_validacao=valor.status_validacao,
        observacoes=valor.observacoes,
        indicador=valor.indicador,
        fonte=valor.fonte_dados.nome if valor.fonte_dados else None,
    )


@router.get("/municipios", response_model=list[schemas.MunicipioRead])
def listar_municipios(db: Session = Depends(get_db)) -> list[models.Municipio]:
    return crud.get_municipios(db)


@router.get("/municipios/{codigo_ibge}", response_model=schemas.MunicipioRead)
def obter_municipio(codigo_ibge: str, db: Session = Depends(get_db)) -> models.Municipio:
    municipio = crud.get_municipio_by_codigo(db, codigo_ibge)
    if not municipio:
        raise HTTPException(status_code=404, detail="Municipio nao encontrado pelo codigo IBGE informado.")
    return municipio


@router.get("/municipios/{codigo_ibge}/indicadores", response_model=schemas.IndicadoresMunicipioResponse)
def listar_indicadores_municipio(
    codigo_ibge: str,
    ano: int | None = Query(default=None, ge=1900, le=2100),
    db: Session = Depends(get_db),
) -> schemas.IndicadoresMunicipioResponse:
    municipio = crud.get_municipio_by_codigo(db, codigo_ibge)
    if not municipio:
        raise HTTPException(status_code=404, detail="Municipio nao encontrado pelo codigo IBGE informado.")

    valores = crud.get_valores_municipio(db, municipio.id, ano=ano)
    return schemas.IndicadoresMunicipioResponse(
        municipio=municipio,
        indicadores=[_valor_to_schema(valor) for valor in valores],
    )
