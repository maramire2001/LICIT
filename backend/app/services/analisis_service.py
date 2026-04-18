import json
import uuid
from app.core.database import AsyncSessionLocal
from app.core.llm_client import chat
from app.models.analisis import Analisis
from app.models.licitacion import Licitacion, Adjudicacion
from app.models.expediente import Expediente
from sqlalchemy import select, func
import redis.asyncio as aioredis
from app.core.config import settings

async def _publish_progress(analisis_id: str, step: str, pct: int):
    r = aioredis.from_url(settings.redis_url)
    try:
        await r.publish(
            f"analisis:{analisis_id}",
            json.dumps({"step": step, "progress": pct}),
        )
    finally:
        await r.aclose()

async def ejecutar_analisis(analisis_id: str, company_id: str, licitacion_id: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Analisis).where(Analisis.id == uuid.UUID(analisis_id))
        )
        analisis = result.scalar_one()

        lic_result = await db.execute(
            select(Licitacion).where(Licitacion.id == uuid.UUID(licitacion_id))
        )
        licitacion = lic_result.scalar_one()

        await _publish_progress(analisis_id, "Leyendo licitación", 10)

        licitacion_text = (
            f"Título: {licitacion.titulo}\n"
            f"Dependencia: {licitacion.dependencia}\n"
            f"Monto estimado: {licitacion.monto_estimado}\n"
            f"Datos adicionales: {json.dumps(licitacion.raw_json, ensure_ascii=False)[:4000]}"
        )

        await _publish_progress(analisis_id, "Analizando requisitos con IA", 30)

        analysis_raw = await chat(
            messages=[
                {
                    "role": "system",
                    "content": "Eres un experto en licitaciones públicas mexicanas. Responde SIEMPRE en JSON válido.",
                },
                {
                    "role": "user",
                    "content": (
                        'Analiza esta licitación y devuelve un JSON con exactamente estas claves:\n'
                        '{\n'
                        '  "modelo_evaluacion": "binario" o "puntos",\n'
                        '  "requisitos_criticos": ["req1", "req2", ...],\n'
                        '  "riesgos_descalificacion": ["riesgo1", ...],\n'
                        '  "viabilidad": "participar" o "con_condiciones" o "no_participar",\n'
                        '  "score_viabilidad": numero entre 0 y 100,\n'
                        '  "justificacion": "texto breve"\n'
                        '}\n\n'
                        f'Licitación:\n{licitacion_text}'
                    ),
                },
            ],
            response_format={"type": "json_object"},
        )
        analysis = json.loads(analysis_raw)

        await _publish_progress(analisis_id, "Consultando historial competitivo", 55)

        adj_result = await db.execute(
            select(Adjudicacion)
            .where(Adjudicacion.dependencia == licitacion.dependencia)
            .order_by(func.random())
            .limit(20)
        )
        adjudicaciones = adj_result.scalars().all()

        competidores: dict[str, dict] = {}
        for adj in adjudicaciones:
            name = adj.empresa_ganadora
            if name not in competidores:
                competidores[name] = {"wins": 0, "montos": []}
            competidores[name]["wins"] += 1
            if adj.monto_adjudicado:
                competidores[name]["montos"].append(float(adj.monto_adjudicado))

        top_competidores = sorted(
            competidores.items(), key=lambda x: x[1]["wins"], reverse=True
        )[:5]

        await _publish_progress(analisis_id, "Calculando Price to Win", 70)

        montos = [float(a.monto_adjudicado) for a in adjudicaciones if a.monto_adjudicado]
        monto_base = licitacion.monto_estimado or (sum(montos) / len(montos) if montos else 0)

        ptw_conservador = float(monto_base) * 0.95 if monto_base else None
        ptw_optimo = float(monto_base) * 0.88 if monto_base else None
        ptw_agresivo = float(monto_base) * 0.80 if monto_base else None

        await _publish_progress(analisis_id, "Generando expediente v1", 85)

        propuesta_raw = await chat(
            messages=[
                {
                    "role": "system",
                    "content": "Eres experto en licitaciones públicas mexicanas. Genera propuestas profesionales.",
                },
                {
                    "role": "user",
                    "content": (
                        "Genera un borrador de propuesta técnica en español para esta licitación. "
                        "Incluye: introducción, metodología propuesta, experiencia relevante, equipo propuesto, y conclusión. "
                        "Máximo 800 palabras. Usa formato markdown.\n\n"
                        f"Licitación: {licitacion.titulo}\n"
                        f"Dependencia: {licitacion.dependencia}\n"
                        f"Requisitos críticos: {', '.join(analysis.get('requisitos_criticos', [])[:5])}"
                    ),
                },
            ],
        )

        expediente = Expediente(
            analisis_id=analisis.id,
            company_id=uuid.UUID(company_id),
            propuesta_tecnica_draft=propuesta_raw,
            checklist={"items": analysis.get("requisitos_criticos", [])},
            faltantes={"items": []},
            carpeta_admin={
                "documentos": [
                    "Acta constitutiva",
                    "RFC",
                    "Opinión SAT 32-D",
                    "Poder notarial",
                    "Estado de cuenta bancario",
                ]
            },
            propuesta_economica={
                "monto_propuesto": ptw_optimo,
                "desglose": [],
            },
        )
        db.add(expediente)

        analisis.status = "listo"
        analisis.viabilidad = analysis.get("viabilidad", "con_condiciones")
        analisis.score_viabilidad = analysis.get("score_viabilidad", 50)
        analisis.modelo_evaluacion_detectado = analysis.get("modelo_evaluacion", "binario")
        analisis.requisitos_criticos = {"items": analysis.get("requisitos_criticos", [])}
        analisis.riesgos = {"items": analysis.get("riesgos_descalificacion", [])}
        analisis.price_to_win_conservador = ptw_conservador
        analisis.ptw_optimo = ptw_optimo
        analisis.ptw_agresivo = ptw_agresivo
        analisis.competidores = {
            "top": [{"empresa": k, **v} for k, v in top_competidores]
        }

        await db.commit()
        await _publish_progress(analisis_id, "Análisis completo", 100)
