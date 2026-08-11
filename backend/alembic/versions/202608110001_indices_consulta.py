"""adiciona indices compostos para consultas publicas

Revision ID: 202608110001
Revises: 202607100001
Create Date: 2026-08-11
"""

from alembic import op


revision = "202608110001"
down_revision = "202607100001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_valores_indicador_ano_municipio",
        "valores_indicadores",
        ["indicador_id", "ano", "municipio_id"],
        unique=False,
    )
    op.create_index(
        "ix_valores_municipio_ano",
        "valores_indicadores",
        ["municipio_id", "ano"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_valores_municipio_ano", table_name="valores_indicadores")
    op.drop_index("ix_valores_indicador_ano_municipio", table_name="valores_indicadores")
