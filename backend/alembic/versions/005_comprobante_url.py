"""add comprobante_url to analisis

Revision ID: 005
Revises: 004
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column(
        "analisis",
        sa.Column("comprobante_url", sa.Text, nullable=True),
    )

def downgrade():
    op.drop_column("analisis", "comprobante_url")
