"""adiciona sentido ao indicador

Revision ID: 202607100001
Revises: 202607070001
Create Date: 2026-07-10
"""
from alembic import op
import sqlalchemy as sa


revision = "202607100001"
down_revision = "202607070001"
branch_labels = None
depends_on = None


# Indicadores conhecidos onde um valor menor representa melhor desempenho,
# ou onde a direcao nao e comparavel (ex.: consumo per capita, codigo
# categorico). Tudo que nao esta listado aqui permanece "maior_melhor",
# que ja era o comportamento implicito antes desta migracao.
MENOR_MELHOR = ["agua_perdas_distribuicao", "drenagem_alagamentos"]
NEUTRO = ["agua_consumo_per_capita", "residuos_massa_coletada_per_capita", "gestao_tipo_prestacao_servico"]


def upgrade() -> None:
    op.add_column(
        "indicadores",
        sa.Column("sentido", sa.String(length=20), nullable=False, server_default="maior_melhor"),
    )

    indicadores = sa.table("indicadores", sa.column("codigo", sa.String), sa.column("sentido", sa.String))

    op.execute(indicadores.update().where(indicadores.c.codigo.in_(MENOR_MELHOR)).values(sentido="menor_melhor"))
    op.execute(indicadores.update().where(indicadores.c.codigo.in_(NEUTRO)).values(sentido="neutro"))


def downgrade() -> None:
    op.drop_column("indicadores", "sentido")
