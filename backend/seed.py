"""Seed database with realistic Mexican licitaciones sample data."""
import asyncio
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://licitia:licitia@db:5432/licitia")

LICITACIONES = [
    {
        "numero_procedimiento": "OCID-MX-IMSS-2024-001",
        "titulo": "Adquisición de Medicamentos y Material de Curación para el IMSS Delegación Jalisco",
        "dependencia": "Instituto Mexicano del Seguro Social",
        "monto_estimado": 45_000_000.00,
        "estado": "activa",
        "fecha_publicacion": datetime.utcnow() - timedelta(days=5),
        "fecha_apertura": datetime.utcnow() + timedelta(days=10),
        "fecha_fallo": datetime.utcnow() + timedelta(days=20),
        "url_fuente": "https://compranet.hacienda.gob.mx/esuite/flow/hospitality",
        "empresa_ganadora": None,
        "monto_adjudicado": None,
    },
    {
        "numero_procedimiento": "OCID-MX-SCT-2024-042",
        "titulo": "Mantenimiento de Carretera Federal No. 15 Tramo Guadalajara-Tepic",
        "dependencia": "Secretaría de Comunicaciones y Transportes",
        "monto_estimado": 120_000_000.00,
        "estado": "activa",
        "fecha_publicacion": datetime.utcnow() - timedelta(days=3),
        "fecha_apertura": datetime.utcnow() + timedelta(days=15),
        "fecha_fallo": datetime.utcnow() + timedelta(days=30),
        "url_fuente": "https://compranet.hacienda.gob.mx/esuite/flow/hospitality",
        "empresa_ganadora": None,
        "monto_adjudicado": None,
    },
    {
        "numero_procedimiento": "OCID-MX-SEP-2024-008",
        "titulo": "Suministro e Instalación de Equipos de Cómputo para Escuelas de Educación Básica",
        "dependencia": "Secretaría de Educación Pública",
        "monto_estimado": 85_000_000.00,
        "estado": "activa",
        "fecha_publicacion": datetime.utcnow() - timedelta(days=7),
        "fecha_apertura": datetime.utcnow() + timedelta(days=8),
        "fecha_fallo": datetime.utcnow() + timedelta(days=18),
        "url_fuente": "https://compranet.hacienda.gob.mx/esuite/flow/hospitality",
        "empresa_ganadora": None,
        "monto_adjudicado": None,
    },
    {
        "numero_procedimiento": "OCID-MX-PEMEX-2024-117",
        "titulo": "Servicios de Ingeniería para Mantenimiento de Plataformas Marinas en el Golfo de México",
        "dependencia": "Petróleos Mexicanos",
        "monto_estimado": 350_000_000.00,
        "estado": "activa",
        "fecha_publicacion": datetime.utcnow() - timedelta(days=2),
        "fecha_apertura": datetime.utcnow() + timedelta(days=25),
        "fecha_fallo": datetime.utcnow() + timedelta(days=45),
        "url_fuente": "https://compranet.hacienda.gob.mx/esuite/flow/hospitality",
        "empresa_ganadora": None,
        "monto_adjudicado": None,
    },
    {
        "numero_procedimiento": "OCID-MX-SHCP-2024-033",
        "titulo": "Desarrollo e Implementación de Sistema de Gestión Documental para la SHCP",
        "dependencia": "Secretaría de Hacienda y Crédito Público",
        "monto_estimado": 22_000_000.00,
        "estado": "activa",
        "fecha_publicacion": datetime.utcnow() - timedelta(days=1),
        "fecha_apertura": datetime.utcnow() + timedelta(days=12),
        "fecha_fallo": datetime.utcnow() + timedelta(days=22),
        "url_fuente": "https://compranet.hacienda.gob.mx/esuite/flow/hospitality",
        "empresa_ganadora": None,
        "monto_adjudicado": None,
    },
    {
        "numero_procedimiento": "OCID-MX-IMSS-2023-298",
        "titulo": "Servicios de Limpieza y Mantenimiento para Hospitales IMSS Zona Norte",
        "dependencia": "Instituto Mexicano del Seguro Social",
        "monto_estimado": 38_000_000.00,
        "estado": "cerrada",
        "fecha_publicacion": datetime.utcnow() - timedelta(days=120),
        "fecha_apertura": datetime.utcnow() - timedelta(days=90),
        "fecha_fallo": datetime.utcnow() - timedelta(days=60),
        "url_fuente": "https://compranet.hacienda.gob.mx/esuite/flow/hospitality",
        "empresa_ganadora": "Servicios Integrados de Limpieza S.A. de C.V.",
        "monto_adjudicado": 36_500_000.00,
    },
    {
        "numero_procedimiento": "OCID-MX-CFE-2023-445",
        "titulo": "Suministro de Transformadores de Distribución para CFE División Centro-Occidente",
        "dependencia": "Comisión Federal de Electricidad",
        "monto_estimado": 95_000_000.00,
        "estado": "cerrada",
        "fecha_publicacion": datetime.utcnow() - timedelta(days=150),
        "fecha_apertura": datetime.utcnow() - timedelta(days=120),
        "fecha_fallo": datetime.utcnow() - timedelta(days=90),
        "url_fuente": "https://compranet.hacienda.gob.mx/esuite/flow/hospitality",
        "empresa_ganadora": "Industrias Eléctricas del Norte S.A. de C.V.",
        "monto_adjudicado": 91_200_000.00,
    },
    {
        "numero_procedimiento": "OCID-MX-ISSSTE-2024-015",
        "titulo": "Adquisición de Equipo Médico para Clínica Hospital ISSSTE Monterrey",
        "dependencia": "Instituto de Seguridad y Servicios Sociales de los Trabajadores del Estado",
        "monto_estimado": 18_500_000.00,
        "estado": "activa",
        "fecha_publicacion": datetime.utcnow() - timedelta(days=4),
        "fecha_apertura": datetime.utcnow() + timedelta(days=6),
        "fecha_fallo": datetime.utcnow() + timedelta(days=16),
        "url_fuente": "https://compranet.hacienda.gob.mx/esuite/flow/hospitality",
        "empresa_ganadora": None,
        "monto_adjudicado": None,
    },
    {
        "numero_procedimiento": "OCID-MX-CONAGUA-2024-022",
        "titulo": "Construcción de Planta de Tratamiento de Aguas Residuales en Municipio de San Luis Potosí",
        "dependencia": "Comisión Nacional del Agua",
        "monto_estimado": 210_000_000.00,
        "estado": "activa",
        "fecha_publicacion": datetime.utcnow() - timedelta(days=6),
        "fecha_apertura": datetime.utcnow() + timedelta(days=20),
        "fecha_fallo": datetime.utcnow() + timedelta(days=40),
        "url_fuente": "https://compranet.hacienda.gob.mx/esuite/flow/hospitality",
        "empresa_ganadora": None,
        "monto_adjudicado": None,
    },
    {
        "numero_procedimiento": "OCID-MX-SEDENA-2024-071",
        "titulo": "Adquisición de Vehículos Todo Terreno para la Secretaría de la Defensa Nacional",
        "dependencia": "Secretaría de la Defensa Nacional",
        "monto_estimado": 65_000_000.00,
        "estado": "cerrada",
        "fecha_publicacion": datetime.utcnow() - timedelta(days=90),
        "fecha_apertura": datetime.utcnow() - timedelta(days=60),
        "fecha_fallo": datetime.utcnow() - timedelta(days=30),
        "url_fuente": "https://compranet.hacienda.gob.mx/esuite/flow/hospitality",
        "empresa_ganadora": "Distribuidora Automotriz Especializada S.A. de C.V.",
        "monto_adjudicado": 62_800_000.00,
    },
]


async def seed():
    engine = create_async_engine(DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
        # Clear existing seed data
        await db.execute(text("DELETE FROM adjudicaciones WHERE nivel_confianza = 'seed'"))
        await db.execute(text("DELETE FROM licitaciones WHERE portal = 'seed'"))
        await db.execute(text("DELETE FROM ingesta_jobs WHERE tipo = 'seed'"))
        await db.commit()

        inserted = 0
        for data in LICITACIONES:
            lic_id = uuid.uuid4()
            await db.execute(text("""
                INSERT INTO licitaciones
                  (id, numero_procedimiento, titulo, dependencia, monto_estimado, estado,
                   fecha_publicacion, fecha_apertura, fecha_fallo, url_fuente, raw_json,
                   portal, modelo_evaluacion, created_at)
                VALUES
                  (:id, :np, :titulo, :dep, :monto, :estado,
                   :fp, :fa, :ff, :url, :raw,
                   'seed', 'binario', NOW())
                ON CONFLICT (numero_procedimiento) DO NOTHING
            """), {
                "id": str(lic_id),
                "np": data["numero_procedimiento"],
                "titulo": data["titulo"],
                "dep": data["dependencia"],
                "monto": data["monto_estimado"],
                "estado": data["estado"],
                "fp": data["fecha_publicacion"],
                "fa": data["fecha_apertura"],
                "ff": data["fecha_fallo"],
                "url": data["url_fuente"],
                "raw": '{}',
            })

            if data.get("empresa_ganadora"):
                await db.execute(text("""
                    INSERT INTO adjudicaciones
                      (id, licitacion_id, empresa_ganadora, monto_adjudicado, dependencia, nivel_confianza)
                    VALUES
                      (:id, :lid, :emp, :monto, :dep, 'seed')
                """), {
                    "id": str(uuid.uuid4()),
                    "lid": str(lic_id),
                    "emp": data["empresa_ganadora"],
                    "monto": data["monto_adjudicado"],
                    "dep": data["dependencia"],
                })
            inserted += 1

        # Mark ingesta as completed
        await db.execute(text("""
            INSERT INTO ingesta_jobs (id, tipo, status, progreso, registros_procesados, created_at)
            VALUES (:id, 'seed', 'completado', 100, :count, NOW())
        """), {"id": str(uuid.uuid4()), "count": inserted})

        await db.commit()
        print(f"Seeded {inserted} licitaciones successfully.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
