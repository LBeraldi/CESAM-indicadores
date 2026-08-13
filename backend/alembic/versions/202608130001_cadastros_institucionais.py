"""adiciona cadastros institucionais municipais

Revision ID: 202608130001
Revises: 202608110001
Create Date: 2026-08-13
"""

import sqlalchemy as sa

from alembic import op

revision = "202608130001"
down_revision = "202608110001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "atendimentos_agua",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("municipio_id", sa.Integer(), nullable=False),
        sa.Column("prestador_nome", sa.String(length=255), nullable=False),
        sa.Column("sigla", sa.String(length=40), nullable=True),
        sa.Column("natureza_juridica", sa.String(length=160), nullable=True),
        sa.Column("area_atuacao", sa.Text(), nullable=True),
        sa.Column("forma_prestacao", sa.Text(), nullable=True),
        sa.Column("instrumento_delegacao", sa.String(length=160), nullable=True),
        sa.Column("fonte", sa.String(length=255), nullable=False),
        sa.Column("ano_referencia", sa.Integer(), nullable=False),
        sa.Column("endereco", sa.Text(), nullable=True),
        sa.Column("site_url", sa.Text(), nullable=False),
        sa.Column("site_label", sa.String(length=160), nullable=False),
        sa.Column("maps_url", sa.Text(), nullable=False),
        sa.Column("fonte_endereco", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["municipio_id"], ["municipios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_atendimentos_agua_municipio_id", "atendimentos_agua", ["municipio_id"], unique=True)
    op.create_index("ix_atendimentos_agua_ano_referencia", "atendimentos_agua", ["ano_referencia"])

    op.create_table(
        "recursos_municipais",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("municipio_id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(length=40), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("direto", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("fonte", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["municipio_id"], ["municipios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("municipio_id", "tipo", name="uq_recurso_municipio_tipo"),
    )
    op.create_index("ix_recursos_municipais_municipio_id", "recursos_municipais", ["municipio_id"])
    op.create_index("ix_recursos_municipais_tipo", "recursos_municipais", ["tipo"])


def downgrade() -> None:
    op.drop_index("ix_recursos_municipais_tipo", table_name="recursos_municipais")
    op.drop_index("ix_recursos_municipais_municipio_id", table_name="recursos_municipais")
    op.drop_table("recursos_municipais")
    op.drop_index("ix_atendimentos_agua_ano_referencia", table_name="atendimentos_agua")
    op.drop_index("ix_atendimentos_agua_municipio_id", table_name="atendimentos_agua")
    op.drop_table("atendimentos_agua")
