"""add pago_status and pago_monto to analisis

Revision ID: 004
Revises: 003
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column(
        "analisis",
        sa.Column(
            "pago_status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'pendiente'"),
        ),
    )
    op.add_column(
        "analisis",
        sa.Column("pago_monto", sa.Numeric, nullable=True),
    )

def downgrade():
    op.drop_column("analisis", "pago_monto")
    op.drop_column("analisis", "pago_status")
