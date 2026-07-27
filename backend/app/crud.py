import unicodedata

from sqlalchemy import Select, case, func, select
from sqlalchemy.orm import Session, joinedload

from app import models


# Preferencia de fonte quando mais de uma cobre o mesmo municipio/indicador/ano
# (o schema permite isso de proposito, para registrar SINISA e SNIS lado a
# lado). Sem essa regra, qual fonte "vence" no ranking dependeria da ordem
# incidental devolvida pelo banco.
def _preferencia_fonte():
    return case(
        (models.ValorIndicador.status_validacao == "oficial_sinisa", 0),
        (models.ValorIndicador.status_validacao == "oficial_snis", 1),
        else_=2,
    )


def _slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    return ascii_text.lower().strip().replace(" ", "_")


def tema_matches(actual: str, requested: str) -> bool:
    return _slug(actual) == _slug(requested)


def get_municipios(db: Session) -> list[models.Municipio]:
    return list(db.scalars(select(models.Municipio).order_by(models.Municipio.nome)).all())


def get_municipio_by_codigo(db: Session, codigo_ibge: str) -> models.Municipio | None:
    return db.scalar(select(models.Municipio).where(models.Municipio.codigo_ibge == codigo_ibge))


def get_indicadores(db: Session, tema: str | None = None) -> list[models.Indicador]:
    indicadores = list(db.scalars(select(models.Indicador).order_by(models.Indicador.tema, models.Indicador.nome)).all())
    if tema:
        return [indicador for indicador in indicadores if tema_matches(indicador.tema, tema)]
    return indicadores


def get_indicador_by_codigo(db: Session, codigo: str) -> models.Indicador | None:
    return db.scalar(select(models.Indicador).where(models.Indicador.codigo == codigo))


def get_valores_municipio(
    db: Session, municipio_id: int, ano: int | None = None
) -> list[models.ValorIndicador]:
    query: Select[tuple[models.ValorIndicador]] = (
        select(models.ValorIndicador)
        .join(models.ValorIndicador.indicador)
        .options(joinedload(models.ValorIndicador.indicador), joinedload(models.ValorIndicador.fonte_dados))
        .where(models.ValorIndicador.municipio_id == municipio_id)
        .order_by(models.ValorIndicador.ano.desc(), models.Indicador.nome)
    )
    if ano:
        query = query.where(models.ValorIndicador.ano == ano)
    return list(db.scalars(query).all())


def get_ranking(
    db: Session, indicador_codigo: str, ano: int, limit: int = 100
) -> tuple[models.Indicador | None, list[models.ValorIndicador]]:
    indicador = get_indicador_by_codigo(db, indicador_codigo)
    if not indicador:
        return None, []

    # 1) Uma linha por municipio: quando duas fontes cobrem o mesmo
    # municipio/indicador/ano, a com maior preferencia vence (ver
    # _preferencia_fonte). So dado oficial entra em um ranking publico.
    linha_preferida_por_municipio = (
        select(models.ValorIndicador.id)
        .where(
            models.ValorIndicador.indicador_id == indicador.id,
            models.ValorIndicador.ano == ano,
            models.ValorIndicador.valor.is_not(None),
            models.ValorIndicador.status_validacao.like("oficial%"),
        )
        .distinct(models.ValorIndicador.municipio_id)
        .order_by(models.ValorIndicador.municipio_id, _preferencia_fonte())
    )
    ids_preferidos = list(db.scalars(linha_preferida_por_municipio).all())
    if not ids_preferidos:
        return indicador, []

    # 2) Ordena pelo sentido do indicador: "menor_melhor" sobe do menor
    # valor; "maior_melhor" e "neutro" mantem o desc historico.
    ordenacao = (
        models.ValorIndicador.valor.asc()
        if indicador.sentido == "menor_melhor"
        else models.ValorIndicador.valor.desc()
    )

    valores = list(
        db.scalars(
            select(models.ValorIndicador)
            .join(models.ValorIndicador.municipio)
            .options(
                joinedload(models.ValorIndicador.municipio),
                joinedload(models.ValorIndicador.indicador),
                joinedload(models.ValorIndicador.fonte_dados),
            )
            .where(models.ValorIndicador.id.in_(ids_preferidos))
            .order_by(ordenacao, models.Municipio.nome)
            .limit(limit)
        ).all()
    )
    return indicador, valores


def get_anos_disponiveis(db: Session, indicador_codigo: str) -> list[int]:
    indicador = get_indicador_by_codigo(db, indicador_codigo)
    if not indicador:
        return []

    anos = db.scalars(
        select(models.ValorIndicador.ano)
        .where(
            models.ValorIndicador.indicador_id == indicador.id,
            models.ValorIndicador.valor.is_not(None),
            models.ValorIndicador.status_validacao.like("oficial%"),
        )
        .distinct()
        .order_by(models.ValorIndicador.ano.desc())
    ).all()
    return list(anos)


def count_rows(db: Session, model: type) -> int:
    return int(db.scalar(select(func.count()).select_from(model)) or 0)
