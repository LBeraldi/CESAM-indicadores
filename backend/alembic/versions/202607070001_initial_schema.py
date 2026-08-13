"""initial schema

Revision ID: 202607070001
Revises:
Create Date: 2026-07-07
"""

import sqlalchemy as sa

from alembic import op

revision = "202607070001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table(
        "municipios",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("codigo_ibge", sa.String(length=7), nullable=False),
        sa.Column("nome", sa.String(length=160), nullable=False),
        sa.Column("uf", sa.String(length=2), nullable=False),
        sa.Column("populacao", sa.Integer(), nullable=True),
        sa.Column("area_km2", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_municipios_codigo_ibge"), "municipios", ["codigo_ibge"], unique=True)
    op.create_index(op.f("ix_municipios_id"), "municipios", ["id"], unique=False)
    op.create_index(op.f("ix_municipios_nome"), "municipios", ["nome"], unique=False)
    op.create_index(op.f("ix_municipios_uf"), "municipios", ["uf"], unique=False)

    op.create_table(
        "fontes_dados",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=120), nullable=False),
        sa.Column("origem", sa.String(length=160), nullable=True),
        sa.Column("ano_referencia", sa.Integer(), nullable=True),
        sa.Column("url_origem", sa.Text(), nullable=True),
        sa.Column("nome_arquivo", sa.String(length=255), nullable=True),
        sa.Column("data_importacao", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_fontes_dados_ano_referencia"), "fontes_dados", ["ano_referencia"], unique=False)
    op.create_index(op.f("ix_fontes_dados_id"), "fontes_dados", ["id"], unique=False)
    op.create_index(op.f("ix_fontes_dados_nome"), "fontes_dados", ["nome"], unique=False)

    op.create_table(
        "indicadores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("codigo", sa.String(length=120), nullable=False),
        sa.Column("nome", sa.String(length=255), nullable=False),
        sa.Column("tema", sa.String(length=80), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("unidade", sa.String(length=60), nullable=True),
        sa.Column("formula", sa.Text(), nullable=True),
        sa.Column("fonte", sa.String(length=160), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_indicadores_codigo"), "indicadores", ["codigo"], unique=True)
    op.create_index(op.f("ix_indicadores_id"), "indicadores", ["id"], unique=False)
    op.create_index(op.f("ix_indicadores_tema"), "indicadores", ["tema"], unique=False)

    op.create_table(
        "logs_importacao",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("arquivo", sa.String(length=255), nullable=False),
        sa.Column("fonte", sa.String(length=120), nullable=False),
        sa.Column("ano_referencia", sa.Integer(), nullable=True),
        sa.Column("total_linhas", sa.Integer(), nullable=False),
        sa.Column("linhas_importadas", sa.Integer(), nullable=False),
        sa.Column("linhas_com_erro", sa.Integer(), nullable=False),
        sa.Column("mensagem", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_logs_importacao_id"), "logs_importacao", ["id"], unique=False)

    op.create_table(
        "valores_indicadores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("municipio_id", sa.Integer(), nullable=False),
        sa.Column("indicador_id", sa.Integer(), nullable=False),
        sa.Column("ano", sa.Integer(), nullable=False),
        sa.Column("valor", sa.Float(), nullable=True),
        sa.Column("fonte_dados_id", sa.Integer(), nullable=True),
        sa.Column("status_validacao", sa.String(length=40), nullable=False),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["fonte_dados_id"], ["fontes_dados.id"]),
        sa.ForeignKeyConstraint(["indicador_id"], ["indicadores.id"]),
        sa.ForeignKeyConstraint(["municipio_id"], ["municipios.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "municipio_id",
            "indicador_id",
            "ano",
            "fonte_dados_id",
            name="uq_valor_municipio_indicador_ano_fonte",
        ),
    )
    op.create_index(op.f("ix_valores_indicadores_ano"), "valores_indicadores", ["ano"], unique=False)
    op.create_index(op.f("ix_valores_indicadores_id"), "valores_indicadores", ["id"], unique=False)
    op.create_index(op.f("ix_valores_indicadores_indicador_id"), "valores_indicadores", ["indicador_id"], unique=False)
    op.create_index(op.f("ix_valores_indicadores_municipio_id"), "valores_indicadores", ["municipio_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_valores_indicadores_municipio_id"), table_name="valores_indicadores")
    op.drop_index(op.f("ix_valores_indicadores_indicador_id"), table_name="valores_indicadores")
    op.drop_index(op.f("ix_valores_indicadores_id"), table_name="valores_indicadores")
    op.drop_index(op.f("ix_valores_indicadores_ano"), table_name="valores_indicadores")
    op.drop_table("valores_indicadores")
    op.drop_index(op.f("ix_logs_importacao_id"), table_name="logs_importacao")
    op.drop_table("logs_importacao")
    op.drop_index(op.f("ix_indicadores_tema"), table_name="indicadores")
    op.drop_index(op.f("ix_indicadores_id"), table_name="indicadores")
    op.drop_index(op.f("ix_indicadores_codigo"), table_name="indicadores")
    op.drop_table("indicadores")
    op.drop_index(op.f("ix_fontes_dados_nome"), table_name="fontes_dados")
    op.drop_index(op.f("ix_fontes_dados_id"), table_name="fontes_dados")
    op.drop_index(op.f("ix_fontes_dados_ano_referencia"), table_name="fontes_dados")
    op.drop_table("fontes_dados")
    op.drop_index(op.f("ix_municipios_uf"), table_name="municipios")
    op.drop_index(op.f("ix_municipios_nome"), table_name="municipios")
    op.drop_index(op.f("ix_municipios_id"), table_name="municipios")
    op.drop_index(op.f("ix_municipios_codigo_ibge"), table_name="municipios")
    op.drop_table("municipios")
