# backend/alembic/versions/002_onboarding_adn.py
"""add onboarding adn fields to companies

Revision ID: 002
Revises: 001
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('companies',
        sa.Column('rango_financiero', sa.String(20), nullable=True))
    op.add_column('companies',
        sa.Column('acreditaciones', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('companies',
        sa.Column('prioridades_instituciones', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('companies',
        sa.Column('intereses_libres', sa.Text(), nullable=True))
    op.add_column('companies',
        sa.Column('tipo_plan', sa.String(20), nullable=True, server_default='radar'))

def downgrade() -> None:
    op.drop_column('companies', 'tipo_plan')
    op.drop_column('companies', 'intereses_libres')
    op.drop_column('companies', 'prioridades_instituciones')
    op.drop_column('companies', 'acreditaciones')
    op.drop_column('companies', 'rango_financiero')
