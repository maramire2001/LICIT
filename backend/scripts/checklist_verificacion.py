"""
Checklist de verificación Motor 1 — análisis con PDFs reales.

Uso:
  1. Subir un PDF real a una licitación:
     curl -X POST http://localhost:8000/api/licitaciones/<LIC_ID>/docs/upload \
       -H "Authorization: Bearer <TOKEN>" \
       -F "file=@bases.pdf"

  2. Disparar análisis:
     curl -X POST http://localhost:8000/api/analisis/ \
       -H "Authorization: Bearer <TOKEN>" \
       -H "Content-Type: application/json" \
       -d '{"licitacion_id": "<LIC_ID>"}'

  3. Esperar que termine y correr este script:
     docker compose exec backend python scripts/checklist_verificacion.py <ANALISIS_ID>
"""

import asyncio
import sys
import json
import uuid
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.analisis import Analisis
from app.models.licitacion import Licitacion, LicitacionDoc
from app.models.expediente import Expediente


CRITERIOS = [
    "¿El PDF fue descargado/subido? (texto_ocr en licitacion_docs)",
    "¿El OCR extrajo texto útil? (>500 chars)",
    "¿requisitos_anexo tiene items? (>0)",
    "¿Los requisitos tienen números de punto? (ej: 3.1, IV.2)",
    "¿El score_viabilidad está entre 0-100?",
    "¿Las matrices tienen items? (humana, materiales, financiera)",
    "¿El PTW es calculado? (ptw_optimo no es None)",
    "¿La propuesta técnica del expediente tiene contenido? (>200 chars)",
]


async def evaluar(analisis_id: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Analisis).where(Analisis.id == uuid.UUID(analisis_id))
        )
        analisis = result.scalar_one_or_none()
        if not analisis:
            print(f"❌ Análisis {analisis_id} no encontrado")
            return

        lic_result = await db.execute(
            select(Licitacion).where(Licitacion.id == analisis.licitacion_id)
        )
        licitacion = lic_result.scalar_one()

        doc_result = await db.execute(
            select(LicitacionDoc).where(
                LicitacionDoc.licitacion_id == analisis.licitacion_id,
                LicitacionDoc.tipo == "convocatoria",
            )
        )
        doc = doc_result.scalar_one_or_none()

        exp_result = await db.execute(
            select(Expediente).where(Expediente.analisis_id == analisis.id)
        )
        expediente = exp_result.scalar_one_or_none()

    print(f"\n{'='*60}")
    print(f"CHECKLIST: {licitacion.titulo[:70]}")
    print(f"Dependencia: {licitacion.dependencia}")
    print(f"Monto: ${licitacion.monto_estimado:,.0f} MXN" if licitacion.monto_estimado else "Monto: N/D")
    print(f"Status análisis: {analisis.status}")
    print(f"{'='*60}\n")

    resultados = []

    # 1. PDF descargado
    tiene_ocr = doc is not None and bool(doc.texto_ocr)
    resultados.append(("PDF descargado/subido", tiene_ocr,
                       f"{len(doc.texto_ocr):,} chars" if tiene_ocr else "Sin texto"))

    # 2. OCR útil
    ocr_util = tiene_ocr and len(doc.texto_ocr) > 500
    resultados.append(("OCR extrajo texto útil (>500 chars)", ocr_util,
                       f"{len(doc.texto_ocr):,} chars" if tiene_ocr else "—"))

    # 3. requisitos_anexo existe
    requisitos = (analisis.anexo_tecnico_requisitos or {}).get("items", [])
    tiene_requisitos = len(requisitos) > 0
    resultados.append(("requisitos_anexo tiene items", tiene_requisitos,
                       f"{len(requisitos)} requisitos"))

    # 4. Requisitos tienen números de punto
    with_numbers = [r for r in requisitos if r.get("numero") and r["numero"].strip()]
    tienen_numeros = len(with_numbers) > 0
    ejemplos = [r["numero"] for r in with_numbers[:3]]
    resultados.append(("Requisitos tienen número de punto", tienen_numeros,
                       f"Ejemplos: {', '.join(ejemplos)}" if ejemplos else "Sin números"))

    # 5. Score viabilidad
    score_ok = analisis.score_viabilidad is not None and 0 <= float(analisis.score_viabilidad) <= 100
    resultados.append(("Score viabilidad entre 0-100", score_ok,
                       f"Score: {analisis.score_viabilidad} / Nivel: {analisis.nivel_complejidad}"))

    # 6. Matrices tienen contenido
    humana = len((analisis.matriz_humana or {}).get("items", []))
    materiales = len((analisis.matriz_materiales or {}).get("items", []))
    financiera = len((analisis.matriz_financiera or {}).get("items", []))
    matrices_ok = humana > 0 and materiales > 0 and financiera > 0
    resultados.append(("Matrices con items", matrices_ok,
                       f"Humana:{humana} / Materiales:{materiales} / Financiera:{financiera}"))

    # 7. PTW calculado
    ptw_ok = analisis.ptw_optimo is not None
    resultados.append(("PTW calculado", ptw_ok,
                       f"Óptimo: ${float(analisis.ptw_optimo):,.0f}" if ptw_ok else "—"))

    # 8. Expediente con contenido
    propuesta = (expediente.propuesta_tecnica_draft or "") if expediente else ""
    propuesta_ok = len(propuesta) > 200
    resultados.append(("Propuesta técnica con contenido", propuesta_ok,
                       f"{len(propuesta):,} chars"))

    # Imprimir resultados
    pasaron = 0
    for nombre, paso, detalle in resultados:
        icono = "✅" if paso else "❌"
        print(f"{icono} {nombre}")
        print(f"   → {detalle}")
        if paso:
            pasaron += 1

    print(f"\n{'='*60}")
    print(f"RESULTADO: {pasaron}/{len(resultados)} criterios cumplidos")
    print(f"{'='*60}")

    # Mostrar muestra de requisitos para revisión manual
    if requisitos:
        print(f"\n--- MUESTRA DE REQUISITOS EXTRAÍDOS (primeros 5) ---")
        for r in requisitos[:5]:
            print(f"\n  [{r.get('numero', '?')}] {r.get('texto', '')[:120]}...")
            print(f"  Categoría: {r.get('categoria')} | Riesgo: {r.get('riesgo')}")
            print(f"  Evidencia: {r.get('evidencia_requerida', '')[:80]}")

    print(f"\n--- PUNTOS CRÍTICOS IDENTIFICADOS ---")
    for i, req in enumerate((analisis.requisitos_criticos or {}).get("items", []), 1):
        print(f"  {i}. {req}")

    print(f"\n--- RIESGOS DE DESCALIFICACIÓN ---")
    for i, riesgo in enumerate((analisis.riesgos or {}).get("items", []), 1):
        print(f"  {i}. {riesgo}")

    return pasaron == len(resultados)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scripts/checklist_verificacion.py <ANALISIS_ID>")
        sys.exit(1)
    asyncio.run(evaluar(sys.argv[1]))
