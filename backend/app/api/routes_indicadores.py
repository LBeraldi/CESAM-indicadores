from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.database import get_db


router = APIRouter(tags=["indicadores"])

INDICADORES_RANKING_SANEAMENTO = [
    "agua_atendimento_total",
    "agua_atendimento_urbano",
    "agua_perdas_distribuicao",
    "esgoto_atendimento_total",
    "esgoto_atendimento_urbano",
    "esgoto_coleta",
    "esgoto_tratamento",
    "residuos_cobertura_coleta_domiciliar",
    "residuos_cobertura_coleta_seletiva",
    "residuos_massa_recuperada_per_capita",
    "aguas_pluviais_vias_pavimentadas",
    "aguas_pluviais_rede_subterranea",
    "aguas_pluviais_domicilios_risco_inundacao",
    "aguas_pluviais_populacao_impactada",
    "gestao_plano_municipal_saneamento",
    "gestao_conselho_municipal",
]


@router.get("/indicadores", response_model=list[schemas.IndicadorRead])
def listar_indicadores(
    tema: str | None = Query(default=None, description="Filtra por tema, aceitando acentos ou slug."),
    db: Session = Depends(get_db),
) -> list[models.Indicador]:
    return crud.get_indicadores(db, tema=tema)


@router.get("/ranking", response_model=list[schemas.RankingItem])
def ranking_indicador(
    indicador: str = Query(..., description="Codigo do indicador, ex.: agua_atendimento_total"),
    ano: int = Query(..., ge=1900, le=2100),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[schemas.RankingItem]:
    indicador_model, valores = crud.get_ranking(db, indicador, ano, limit=limit)
    if indicador_model is None:
        raise HTTPException(status_code=404, detail="Indicador nao encontrado pelo codigo informado.")

    return [
        schemas.RankingItem(
            posicao=index + 1,
            codigo_ibge=valor.municipio.codigo_ibge,
            municipio=valor.municipio.nome,
            uf=valor.municipio.uf,
            ano=valor.ano,
            valor=valor.valor,
            indicador=indicador_model.codigo,
            unidade=indicador_model.unidade,
            fonte=valor.fonte_dados.nome if valor.fonte_dados else None,
            sentido=indicador_model.sentido,
        )
        for index, valor in enumerate(valores)
    ]


@router.get("/ranking/saneamento", response_model=list[schemas.RankingSaneamentoValor])
def ranking_saneamento(
    ano: int = Query(default=2023, ge=1900, le=2100),
    db: Session = Depends(get_db),
) -> list[schemas.RankingSaneamentoValor]:
    valores = crud.get_ranking_saneamento(db, INDICADORES_RANKING_SANEAMENTO, ano)
    return [
        schemas.RankingSaneamentoValor(
            codigo_ibge=valor.municipio.codigo_ibge,
            municipio=valor.municipio.nome,
            uf=valor.municipio.uf,
            ano=valor.ano,
            valor=float(valor.valor),
            indicador=valor.indicador.codigo,
            unidade=valor.indicador.unidade,
            fonte=valor.fonte_dados.nome if valor.fonte_dados else None,
            sentido=valor.indicador.sentido,
        )
        for valor in valores
        if valor.valor is not None
    ]


@router.get("/indicadores/{codigo}/anos", response_model=list[int])
def anos_disponiveis(codigo: str, db: Session = Depends(get_db)) -> list[int]:
    return crud.get_anos_disponiveis(db, codigo)
