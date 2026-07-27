from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.database import get_db
from app.services.ibge import buscar_metadados_municipio, buscar_metadados_municipios_ms


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


def _atualizar_metadados_ibge(db: Session, municipio: models.Municipio) -> models.Municipio:
    try:
        metadados = buscar_metadados_municipio(municipio.codigo_ibge)
    except Exception:
        return municipio

    alterado = False
    if metadados.populacao is not None and municipio.populacao != metadados.populacao:
        municipio.populacao = metadados.populacao
        alterado = True
    if metadados.area_km2 is not None and municipio.area_km2 != metadados.area_km2:
        municipio.area_km2 = metadados.area_km2
        alterado = True

    if alterado:
        db.add(municipio)
        db.commit()
        db.refresh(municipio)

    return municipio


def _preencher_metadados_ibge_em_lote(
    db: Session, municipios: list[models.Municipio]
) -> list[models.Municipio]:
    if not any(municipio.populacao is None or municipio.area_km2 is None for municipio in municipios):
        return municipios

    try:
        metadados_por_codigo = buscar_metadados_municipios_ms()
    except Exception:
        return municipios

    alterado = False
    for municipio in municipios:
        metadados = metadados_por_codigo.get(municipio.codigo_ibge)
        if not metadados:
            continue
        if municipio.populacao is None and metadados.populacao is not None:
            municipio.populacao = metadados.populacao
            alterado = True
        if municipio.area_km2 is None and metadados.area_km2 is not None:
            municipio.area_km2 = metadados.area_km2
            alterado = True

    if alterado:
        db.add_all(municipios)
        db.commit()
        for municipio in municipios:
            db.refresh(municipio)

    return municipios


@router.get("/municipios", response_model=list[schemas.MunicipioRead])
def listar_municipios(db: Session = Depends(get_db)) -> list[models.Municipio]:
    return _preencher_metadados_ibge_em_lote(db, crud.get_municipios(db))


@router.get("/municipios/{codigo_ibge}", response_model=schemas.MunicipioRead)
def obter_municipio(codigo_ibge: str, db: Session = Depends(get_db)) -> models.Municipio:
    municipio = crud.get_municipio_by_codigo(db, codigo_ibge)
    if not municipio:
        raise HTTPException(status_code=404, detail="Municipio nao encontrado pelo codigo IBGE informado.")
    return _atualizar_metadados_ibge(db, municipio)


@router.get("/municipios/{codigo_ibge}/indicadores", response_model=schemas.IndicadoresMunicipioResponse)
def listar_indicadores_municipio(
    codigo_ibge: str,
    ano: int | None = Query(default=None, ge=1900, le=2100),
    db: Session = Depends(get_db),
) -> schemas.IndicadoresMunicipioResponse:
    municipio = crud.get_municipio_by_codigo(db, codigo_ibge)
    if not municipio:
        raise HTTPException(status_code=404, detail="Municipio nao encontrado pelo codigo IBGE informado.")

    municipio = _atualizar_metadados_ibge(db, municipio)
    valores = crud.get_valores_municipio(db, municipio.id, ano=ano)
    return schemas.IndicadoresMunicipioResponse(
        municipio=municipio,
        indicadores=[_valor_to_schema(valor) for valor in valores],
    )
