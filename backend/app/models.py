from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Municipio(TimestampMixin, Base):
    __tablename__ = "municipios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    codigo_ibge: Mapped[str] = mapped_column(String(7), unique=True, index=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    uf: Mapped[str] = mapped_column(String(2), index=True, nullable=False, default="MS")
    populacao: Mapped[int | None] = mapped_column(Integer, nullable=True)
    area_km2: Mapped[float | None] = mapped_column(Float, nullable=True)

    valores: Mapped[list["ValorIndicador"]] = relationship(back_populates="municipio")


class FonteDados(Base):
    __tablename__ = "fontes_dados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    origem: Mapped[str | None] = mapped_column(String(160), nullable=True)
    ano_referencia: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    url_origem: Mapped[str | None] = mapped_column(Text, nullable=True)
    nome_arquivo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    data_importacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)

    valores: Mapped[list["ValorIndicador"]] = relationship(back_populates="fonte_dados")


class Indicador(TimestampMixin, Base):
    __tablename__ = "indicadores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    tema: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    unidade: Mapped[str | None] = mapped_column(String(60), nullable=True)
    formula: Mapped[str | None] = mapped_column(Text, nullable=True)
    fonte: Mapped[str | None] = mapped_column(String(160), nullable=True)
    # "maior_melhor" | "menor_melhor" | "neutro". Fonte unica de verdade para
    # direcao de comparacao: usado no ORDER BY de /ranking para nao depender
    # de listas hardcoded duplicadas no frontend.
    sentido: Mapped[str] = mapped_column(String(20), default="maior_melhor", server_default="maior_melhor", nullable=False)

    valores: Mapped[list["ValorIndicador"]] = relationship(back_populates="indicador")


class ValorIndicador(TimestampMixin, Base):
    __tablename__ = "valores_indicadores"
    __table_args__ = (
        UniqueConstraint(
            "municipio_id",
            "indicador_id",
            "ano",
            "fonte_dados_id",
            name="uq_valor_municipio_indicador_ano_fonte",
        ),
        Index("ix_valores_indicador_ano_municipio", "indicador_id", "ano", "municipio_id"),
        Index("ix_valores_municipio_ano", "municipio_id", "ano"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    municipio_id: Mapped[int] = mapped_column(ForeignKey("municipios.id"), index=True, nullable=False)
    indicador_id: Mapped[int] = mapped_column(ForeignKey("indicadores.id"), index=True, nullable=False)
    ano: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    valor: Mapped[float | None] = mapped_column(Float, nullable=True)
    fonte_dados_id: Mapped[int | None] = mapped_column(ForeignKey("fontes_dados.id"), nullable=True)
    status_validacao: Mapped[str] = mapped_column(String(40), default="pendente", nullable=False)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)

    municipio: Mapped[Municipio] = relationship(back_populates="valores")
    indicador: Mapped[Indicador] = relationship(back_populates="valores")
    fonte_dados: Mapped[FonteDados | None] = relationship(back_populates="valores")


class LogImportacao(Base):
    __tablename__ = "logs_importacao"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    arquivo: Mapped[str] = mapped_column(String(255), nullable=False)
    fonte: Mapped[str] = mapped_column(String(120), nullable=False)
    ano_referencia: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_linhas: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    linhas_importadas: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    linhas_com_erro: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mensagem: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
