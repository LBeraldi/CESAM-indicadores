from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MunicipioBase(BaseModel):
    codigo_ibge: str
    nome: str
    uf: str
    populacao: int | None = None
    area_km2: float | None = None


class MunicipioRead(MunicipioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class IndicadorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo: str
    nome: str
    tema: str
    descricao: str | None = None
    unidade: str | None = None
    formula: str | None = None
    fonte: str | None = None
    sentido: str
    created_at: datetime
    updated_at: datetime


class ValorIndicadorRead(BaseModel):
    id: int
    ano: int
    valor: float | None
    status_validacao: str
    observacoes: str | None = None
    indicador: IndicadorRead
    fonte: str | None = None


class IndicadoresMunicipioResponse(BaseModel):
    municipio: MunicipioRead
    indicadores: list[ValorIndicadorRead]


class RankingItem(BaseModel):
    posicao: int
    codigo_ibge: str
    municipio: str
    uf: str
    ano: int
    valor: float | None
    indicador: str
    unidade: str | None = None
    fonte: str | None = None
    sentido: str


class HealthResponse(BaseModel):
    status: str
    service: str
    database: str
