"""add anatomia fields to analisis

Revision ID: 003
Revises: 002
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('analisis',
        sa.Column('nivel_complejidad', sa.String(10), nullable=True))
    op.add_column('analisis',
        sa.Column('matriz_humana', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('analisis',
        sa.Column('matriz_materiales', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('analisis',
        sa.Column('matriz_financiera', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('analisis',
        sa.Column('roi_datos', postgresql.JSON(astext_type=sa.Text()), nullable=True))

def downgrade() -> None:
    op.drop_column('analisis', 'roi_datos')
    op.drop_column('analisis', 'matriz_financiera')
    op.drop_column('analisis', 'matriz_materiales')
    op.drop_column('analisis', 'matriz_humana')
    op.drop_column('analisis', 'nivel_complejidad')
