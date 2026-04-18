import asyncio
from app.workers.celery_app import celery_app
from app.services.crawler import fetch_licitaciones_page, parse_ocds_release
from app.models.licitacion import Licitacion, Adjudicacion, IngestaJob
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker


def _make_session():
    from app.core.config import settings
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    return async_sessionmaker(engine, expire_on_commit=False), engine


@celery_app.task(name="app.workers.ingesta.backfill_ingesta")
def backfill_ingesta():
    asyncio.run(_backfill())


@celery_app.task(name="app.workers.ingesta.incremental_ingesta")
def incremental_ingesta():
    asyncio.run(_incremental())


async def _backfill():
    Session, engine = _make_session()
    try:
        async with Session() as db:
            job = IngestaJob(tipo="backfill", status="en_progreso")
            db.add(job)
            await db.commit()
            try:
                page = 1
                total = 0
                while True:
                    data = await fetch_licitaciones_page(page=page, page_size=200)
                    releases = data.get("results", [])
                    if not releases:
                        break
                    await _upsert_releases(db, releases)
                    total += len(releases)
                    page_count = data.get("pagination", {}).get("pageCount", 1)
                    job.registros_procesados = total
                    job.progreso = min(int((page / max(page_count, 1)) * 100), 99)
                    await db.commit()
                    page += 1
                job.status = "completado"
                job.progreso = 100
                await db.commit()
            except Exception as e:
                job.status = "error"
                job.error = str(e)
                await db.commit()
                raise
    finally:
        await engine.dispose()


async def _incremental():
    Session, engine = _make_session()
    try:
        async with Session() as db:
            data = await fetch_licitaciones_page(page=1, page_size=100)
            releases = data.get("results", [])
            await _upsert_releases(db, releases)
            await db.commit()
    finally:
        await engine.dispose()


async def _upsert_releases(db, releases: list[dict]):
    for release in releases:
        parsed = parse_ocds_release(release)
        ocid = parsed["numero_procedimiento"]
        if not ocid:
            continue
        result = await db.execute(
            select(Licitacion).where(Licitacion.numero_procedimiento == ocid)
        )
        existing = result.scalar_one_or_none()
        if not existing:
            lic = Licitacion(
                numero_procedimiento=ocid,
                titulo=parsed["titulo"],
                dependencia=parsed["dependencia"],
                monto_estimado=parsed["monto_estimado"],
                estado=parsed["estado"],
                url_fuente=parsed["url_fuente"],
                raw_json=parsed["raw_json"],
            )
            db.add(lic)
            await db.flush()
            if parsed.get("empresa_ganadora"):
                adj = Adjudicacion(
                    licitacion_id=lic.id,
                    empresa_ganadora=parsed["empresa_ganadora"],
                    monto_adjudicado=parsed["monto_adjudicado"],
                    dependencia=parsed["dependencia"],
                    nivel_confianza="medio",
                )
                db.add(adj)
