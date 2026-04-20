"""add anexo_tecnico_requisitos to analisis

Revision ID: 006
Revises: 005
Create Date: 2026-04-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "analisis",
        sa.Column(
            "anexo_tecnico_requisitos",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("analisis", "anexo_tecnico_requisitos")
