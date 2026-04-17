"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-17
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table('companies',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('nombre', sa.String(255), nullable=False),
        sa.Column('rfc', sa.String(13), nullable=False),
        sa.Column('sector', sa.String(100), nullable=False),
        sa.Column('regiones', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('cucop_codes', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('perfil_semantico', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('rfc'),
    )

    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('supabase_uid', sa.String(255), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('rol', sa.String(20), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('supabase_uid'),
    )

    op.create_table('licitaciones',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('numero_procedimiento', sa.String(100), nullable=False),
        sa.Column('titulo', sa.Text(), nullable=False),
        sa.Column('dependencia', sa.String(255), nullable=False),
        sa.Column('fecha_publicacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_apertura', sa.DateTime(), nullable=True),
        sa.Column('fecha_fallo', sa.DateTime(), nullable=True),
        sa.Column('monto_estimado', sa.Numeric(), nullable=True),
        sa.Column('modelo_evaluacion', sa.String(20), nullable=False),
        sa.Column('estado', sa.String(20), nullable=False),
        sa.Column('portal', sa.String(50), nullable=False),
        sa.Column('url_fuente', sa.Text(), nullable=True),
        sa.Column('raw_json', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('embedding', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('numero_procedimiento'),
    )

    op.create_table('licitacion_docs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('licitacion_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tipo', sa.String(50), nullable=False),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('texto_ocr', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table('adjudicaciones',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('licitacion_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('empresa_ganadora', sa.String(255), nullable=False),
        sa.Column('monto_adjudicado', sa.Numeric(), nullable=True),
        sa.Column('año', sa.Integer(), nullable=True),
        sa.Column('dependencia', sa.String(255), nullable=False),
        sa.Column('nivel_confianza', sa.String(10), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table('ingesta_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tipo', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('progreso', sa.Integer(), nullable=False),
        sa.Column('registros_procesados', sa.Integer(), nullable=False),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table('analisis',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('licitacion_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('viabilidad', sa.String(30), nullable=True),
        sa.Column('score_viabilidad', sa.Numeric(), nullable=True),
        sa.Column('modelo_evaluacion_detectado', sa.String(20), nullable=True),
        sa.Column('requisitos_criticos', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('riesgos', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('price_to_win_conservador', sa.Numeric(), nullable=True),
        sa.Column('ptw_optimo', sa.Numeric(), nullable=True),
        sa.Column('ptw_agresivo', sa.Numeric(), nullable=True),
        sa.Column('competidores', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table('expedientes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('analisis_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('carpeta_admin', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('propuesta_tecnica_draft', sa.Text(), nullable=True),
        sa.Column('propuesta_economica', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('checklist', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('faltantes', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table('vault_documentos',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tipo', sa.String(30), nullable=False),
        sa.Column('archivo_url', sa.Text(), nullable=False),
        sa.Column('fecha_vigencia', sa.Date(), nullable=True),
        sa.Column('datos_extraidos', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('vigente', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

def downgrade() -> None:
    op.drop_table('vault_documentos')
    op.drop_table('expedientes')
    op.drop_table('analisis')
    op.drop_table('ingesta_jobs')
    op.drop_table('adjudicaciones')
    op.drop_table('licitacion_docs')
    op.drop_table('licitaciones')
    op.drop_table('users')
    op.drop_table('companies')
