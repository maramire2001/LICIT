from app.workers.celery_app import celery_app

@celery_app.task(name="app.workers.pipeline.run_analisis")
def run_analisis(analisis_id: str, company_id: str, licitacion_id: str):
    import asyncio
    from app.services.analisis_service import ejecutar_analisis
    asyncio.run(ejecutar_analisis(analisis_id, company_id, licitacion_id))
