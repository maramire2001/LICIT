import json
import logging
import uuid
from app.core.database import AsyncSessionLocal
from app.core.llm_client import chat
from app.models.analisis import Analisis
from app.models.licitacion import Licitacion, Adjudicacion
from app.models.expediente import Expediente
from app.services.pdf_downloader import get_or_fetch_ocr
from sqlalchemy import select, func
import redis.asyncio as aioredis
from app.core.config import settings

_log = logging.getLogger(__name__)

ROI_FIJO = {
    "horas_equipo": 72,
    "costo_por_hora_mxn": 350,
    "costo_total_mxn": 25_200,
    "tiempo_licit_ia": "180 segundos",
}

DEPENDENCIAS_ORO = ["IMSS", "ISSSTE", "PEMEX", "CFE", "SEDENA", "SEMAR", "CAPUFE", "FONATUR"]
KEYWORDS_PLATA = ["ESTADO", "GOBIERNO DEL ESTADO", "MUNICIPIO", "SECRETARIA"]


def _clasificar_complejidad(dependencia: str, monto: float | None) -> str:
    dep = (dependencia or "").upper()
    if any(k in dep for k in DEPENDENCIAS_ORO):
        return "oro"
    if monto and monto >= 20_000_000:
        return "oro"
    if monto and monto >= 5_000_000:
        return "plata"
    if any(k in dep for k in KEYWORDS_PLATA):
        return "plata"
    return "bronce"


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
        try:
            await _run_analisis(db, analisis_id, company_id, licitacion_id)
        except Exception as exc:
            _log.exception("analisis_id=%s unhandled error: %s", analisis_id, exc)
            try:
                r = await db.execute(select(Analisis).where(Analisis.id == uuid.UUID(analisis_id)))
                a = r.scalar_one_or_none()
                if a:
                    a.status = "error"
                    await db.commit()
            except Exception:
                pass


async def _run_analisis(db, analisis_id: str, company_id: str, licitacion_id: str):
    result = await db.execute(
        select(Analisis).where(Analisis.id == uuid.UUID(analisis_id))
    )
    analisis = result.scalar_one()

    lic_result = await db.execute(
        select(Licitacion).where(Licitacion.id == uuid.UUID(licitacion_id))
    )
    licitacion = lic_result.scalar_one()

    await _publish_progress(analisis_id, "Descargando bases de licitación (PDF)", 10)

    texto_ocr = await get_or_fetch_ocr(db, licitacion)

    if texto_ocr:
        licitacion_text = (
            f"Título: {licitacion.titulo}\n"
            f"Dependencia: {licitacion.dependencia}\n"
            f"Monto estimado: {licitacion.monto_estimado}\n\n"
            f"--- TEXTO COMPLETO DE LAS BASES (OCR) ---\n{texto_ocr}"
        )
    else:
        licitacion_text = (
            f"Título: {licitacion.titulo}\n"
            f"Dependencia: {licitacion.dependencia}\n"
            f"Monto estimado: {licitacion.monto_estimado}\n"
            f"Datos adicionales: {json.dumps(licitacion.raw_json, ensure_ascii=False)[:4000]}\n"
            f"NOTA: No se pudo descargar el PDF de las bases. Análisis basado solo en metadatos."
        )

    await _publish_progress(analisis_id, "Extrayendo requisitos técnicos con IA", 25)

    PROMPT_ANALISIS = (
        "Analiza esta licitación y devuelve un JSON con exactamente estas claves:\n"
        "{\n"
        '  "modelo_evaluacion": "binario" o "puntos",\n'
        '  "viabilidad": "participar" o "con_condiciones" o "no_participar",\n'
        '  "score_viabilidad": numero entre 0 y 100,\n'
        '  "justificacion": "texto breve de 2-3 oraciones",\n'
        '  "matriz_humana": [\n'
        '    {"requisito": "descripcion del requisito de personal", "nivel_riesgo": "alto"|"medio"|"bajo"}\n'
        "  ],\n"
        '  "matriz_materiales": [\n'
        '    {"requisito": "descripcion del requisito de equipo o material", "nivel_riesgo": "alto"|"medio"|"bajo"}\n'
        "  ],\n"
        '  "matriz_financiera": [\n'
        '    {"requisito": "descripcion del requisito financiero o documental", "nivel_riesgo": "alto"|"medio"|"bajo"}\n'
        "  ],\n"
        '  "presupuesto_estimado": numero en pesos MXN extraído del texto (0 si no se menciona),\n'
        '  "requisitos_criticos": ["lista de los 5 requisitos mas importantes"],\n'
        '  "riesgos_descalificacion": ["lista de hasta 4 causas comunes de descalificacion en este tipo de licitacion"],\n'
        '  "requisitos_anexo": [\n'
        '    {\n'
        '      "numero": "identificador del punto en las bases, ej: 3.1 o IV.2.a",\n'
        '      "texto": "texto exacto o parafraseo fiel del requisito tal como aparece en las bases",\n'
        '      "categoria": "legal" o "tecnico" o "financiero",\n'
        '      "riesgo": "alto" o "medio" o "bajo",\n'
        '      "evidencia_requerida": "documento o acreditacion especifica que exige este punto"\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Reglas para requisitos_anexo:\n"
        "- Extrae TODOS los requisitos numerados del Anexo Técnico y bases de licitación\n"
        "- Usa el número/identificador exacto que aparece en el documento\n"
        "- Si no hay PDF disponible, genera requisitos típicos para este tipo de licitación\n"
        "- Incluye entre 5 y 30 items\n\n"
        "Reglas para matrices:\n"
        "- matriz_humana: perfiles de personal, certificaciones, cantidades de elementos\n"
        "- matriz_materiales: equipos, insumos, vehículos, tecnología requerida\n"
        "- matriz_financiera: capital contable, liquidez, estados financieros, fianzas, seguros\n"
        "- Cada matriz: entre 2 y 5 items\n"
        "- nivel_riesgo 'alto' = causa frecuente de descalificación\n\n"
        f"Licitación:\n{licitacion_text}"
    )

    analysis_raw = await chat(
        messages=[
            {
                "role": "system",
                "content": (
                    "Eres un experto en licitaciones públicas mexicanas con 20 años de experiencia. "
                    "Realizas auditorías forenses de convocatorias gubernamentales. "
                    "Responde SIEMPRE en JSON válido, sin texto adicional."
                ),
            },
            {"role": "user", "content": PROMPT_ANALISIS},
        ],
        response_format={"type": "json_object"},
    )

    if not analysis_raw or not analysis_raw.strip():
        _log.error("analisis_id=%s Claude returned empty response", analisis_id)
        analisis.status = "error"
        await db.commit()
        return

    # Strip markdown code fences if Claude wrapped the JSON
    cleaned = analysis_raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned[: cleaned.rfind("```")]

    try:
        analysis = json.loads(cleaned)
    except json.JSONDecodeError:
        _log.error("analisis_id=%s invalid JSON from Claude: %r", analisis_id, analysis_raw[:200])
        analisis.status = "error"
        await db.commit()
        return

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
    monto_base = (
        licitacion.monto_estimado
        or (sum(montos) / len(montos) if montos else None)
        or (analysis.get("presupuesto_estimado") or None)
    )

    ptw_conservador = float(monto_base) * 0.95 if monto_base else None
    ptw_optimo = float(monto_base) * 0.88 if monto_base else None
    ptw_agresivo = float(monto_base) * 0.80 if monto_base else None

    nivel_complejidad = _clasificar_complejidad(
        licitacion.dependencia, float(monto_base) if monto_base else None
    )

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
    analisis.nivel_complejidad = nivel_complejidad
    analisis.matriz_humana = {"items": analysis.get("matriz_humana", [])}
    analisis.matriz_materiales = {"items": analysis.get("matriz_materiales", [])}
    analisis.matriz_financiera = {"items": analysis.get("matriz_financiera", [])}
    analisis.roi_datos = ROI_FIJO
    analisis.anexo_tecnico_requisitos = {"items": analysis.get("requisitos_anexo", [])}

    await db.commit()
    await _publish_progress(analisis_id, "Análisis completo", 100)
