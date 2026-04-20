"""add anexo_respuestas to expedientes

Revision ID: 007
Revises: 006
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "expedientes",
        sa.Column(
            "anexo_respuestas",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("expedientes", "anexo_respuestas")
