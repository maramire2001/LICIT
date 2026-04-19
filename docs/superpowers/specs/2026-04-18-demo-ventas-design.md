# Demo de Ventas — Design Spec

## Goal

Crear una demo interactiva espectacular en `/demo` que recorra el journey completo del cliente en 6 fases, usando datos simulados pero alineados 100% con lo que la app real genera. Todo lo que muestra la demo existe en la app. Actualizar la app en paralelo para mantener esa alineación (disclaimers, números exactos de ROI).

## Architecture

Demo: página Next.js client-only (`/demo/page.tsx`), sin llamadas al backend. Máquina de estados React con 6 fases. Datos hardcodeados, coherentes con las respuestas del interrogatorio del usuario. Animaciones con CSS transitions + `requestAnimationFrame` para contadores.

App alignment: cambios menores en `expediente.py` (disclaimer en portada.txt), `expediente/[id]/page.tsx` (disclaimer UI), `vault/page.tsx` (disclaimer UI).

## Formato

**Híbrido:** el cliente controla *cuándo avanza* entre fases (click en CTA). Los resultados dentro de cada fase se *auto-animan* una vez disparados (counters, barras de progreso, reveal secuencial). Funciona tanto en reunión de ventas como como link self-serve.

## Tech Stack

Next.js 16 App Router, React, TypeScript, Tailwind. Sin dependencias nuevas.

---

## Fases de la Demo

### Fase 1 — Interrogatorio ADN

Pantalla inicial. 5 preguntas en una sola vista, todas las opciones visibles (radio/checkbox), no dropdowns. El usuario selecciona y hace clic en "⚡ Activar mi Radar".

**Preguntas y opciones:**

**01 Especialidad** (radio, una sola):
- 🔒 Seguridad Privada *(pre-seleccionado para el flujo demo)*
- 🧹 Limpieza y Mantenimiento
- 🏗️ Construcción e Infraestructura
- 💻 Tecnologías de la Información
- 🏥 Salud y Farmacéutica
- ⋯ Otros

**02 Cobertura** (checkbox, múltiple):
- 🌎 Nacional *(pre-seleccionado)*
- 🏙️ Zona Centro (CDMX y Edomex)
- 🏜️ Zona Norte
- 🌊 Occidente (Jalisco, Colima, Nayarit)
- 🌿 Sureste (Oaxaca, Chiapas, Yucatán)
- ⋯ Otros

**03 Rango por contrato** (radio, una sola):
- 💰 Menos de $5M MXN
- 💰💰 $5M – $20M MXN
- 💰💰💰 $20M – $100M MXN
- 💰💰💰💰 $100M+ MXN *(pre-seleccionado)*
- ⋯ Otro rango

**04 Acreditaciones** (checkbox, múltiple):
- ✅ REPSE (STPS) *(pre-seleccionado)*
- ✅ ISO 9001:2015 *(pre-seleccionado)*
- ISO 27001
- ESR (Empresa Socialmente Responsable)
- Programa PyME (SE)
- ⋯ Otros

**05 Instituciones Prioritarias** (checkbox, múltiple — grid 3 columnas):
- 🏥 IMSS — CompraNet *(pre-seleccionado)*
- 🏥 ISSSTE — CompraNet
- 🪖 SEDENA — CompraNet
- 🛣️ CAPUFE — CompraNet
- ✈️ AIFA / ASA — CompraNet
- 🏛️ Gobierno Federal — CompraNet
- ⛽ PEMEX — *Próximamente* (desactivado)
- ⚡ CFE — *Próximamente* (desactivado)
- 🏙️ Estados y Municipios — CompraNet (parcial)

**Escape hatch** (bloque verde debajo del grid): *"¿Tienes una convocatoria que no aparece aquí? Súbela directamente — la analizamos al instante y armamos tu expediente."*

**Disclaimer breve** (fondo de pantalla, texto gris): *"Herramienta de apoyo estratégico. La presentación final es responsabilidad del participante."*

**CTA:** `⚡ Activar mi Radar — Ver mis oportunidades →`

---

### Fase 2 — Radar Personalizado

Aparece tras el click. Header: *"8 oportunidades encontradas para tu perfil · Seguridad · Nacional · $100M+ · IMSS"*.

**3 cards con ADN match** (punto verde, borde verde):
1. `IMSS-00-GYR-LAOS-001/2025` — Servicio de Seguridad Intramuros — 18 UMAE Región Centro-Sur · IMSS · $124,500,000 · Apertura 03 jun 2025 — botón **"⚡ Me interesa — Analizar"**
2. `SEDENA-OADPRS-LAO-011/2025` — Vigilancia y Rondines — Instalaciones Militares Zona Centro · $89,200,000
3. `CAPUFE-OA-LAOS-007/2025` — Seguridad Perimetral — 12 Plazas de Cobro · $67,800,000

**2 cards grises sin match** (opacidad 50%, etiqueta "Sin match ADN"):
- ISSSTE limpieza — fuera de sector
- CAPUFE mantenimiento — rango fuera de techo

**Escape hatch amarillo** (al fondo): *"¿Tienes una convocatoria que no aparece aquí? Súbela directamente"* + botón "Subir PDF".

**CTA que avanza la demo:** botón "⚡ Me interesa — Analizar" de la card 1.

---

### Fase 3 — Anatomía Cinematográfica

**3A — Loading (~8 segundos, auto-anima):**

Pasos que se van completando secuencialmente:
1. Leyendo bases de licitación (PDF, 248 páginas)…
2. Extrayendo requisitos técnicos, legales y financieros…
3. Construyendo matrices Humana · Materiales · Financiera…
4. Consultando 29 adjudicaciones históricas del IMSS…
5. Calculando escenarios Price to Win…
6. Evaluando nivel de complejidad: Bronce · Plata · Oro…

Cada paso: círculo pulsante azul mientras está activo → círculo verde con ✓ cuando termina → el siguiente activa. Barra de progreso con porcentaje. Duración total: ~8s.

**3B — Reveal secuencial** (bloques aparecen de arriba hacia abajo con fade-in, 400ms entre cada uno):

1. **Banner ROI**: *"Análisis completado en 180 segundos · Tu equipo habría tardado 72 horas · Ahorro operativo: $25,200 MXN"*

2. **Score + Nivel**: anillo animado contando hasta 92/100 (easing cúbico, 1.4s) + badge 🏆 ORO

3. **Matrices**: 3 columnas — Humana (450 elementos, 3 turnos, REPSE + ISO) · Materiales (Radios digitales, Uniformes IMSS, Vehículos) · Financiera (Capital $18.7M, Estados fin. 3 años, Fianza 30%)

4. **Red flags**: 🔴 REPSE vigente 12 meses mínimo · 🔴 ISO 9001 debe cubrir reclutamiento seguridad · 🟡 INFONAVIT aplica también a subcontratistas

5. **CTA:** `🏆 Esta licitación es Nivel ORO — Ver precio y concursar →` (botón dorado)

---

### Fase 4 — Pago por Complejidad

**Header**: *"¿Quieres concursar por este contrato?"*

3 tarjetas:
- **🥉 Bronce $20,000 MXN** — griseada, "No aplica para esta licitación"
- **🥈 Plata $30,000 MXN** — griseada, "No aplica para esta licitación"
- **🏆 Oro $40,000 MXN** — activa, badge "TU NIVEL", lista de 4 entregables incluidos, botón dorado "Concursar — Pagar $40,000 →"

**Bloque verde de valor**: *"El contrato vale $124,500,000 — nuestro fee es el 0.032% del total · ROI de 3,112x si ganas"*

En demo: el botón simula pago inmediato (sin pasarela real), avanza directo a Fase 5.

---

### Fase 5 — Vault Inteligente

**Banner IA**: *"LICIT-IA analizó el Anexo Técnico. Para cumplir los puntos 3.1, 4.2 y 6.8 de las bases del IMSS, necesitas subir los siguientes documentos."*

**Lista de 5 documentos** con estados:
- ✓ Acta Constitutiva — *Auditado por IA · Cumple requisito 3.1*
- ✓ Constancia REPSE — *Vigencia confirmada 18 meses*
- ✓ ISO 9001:2015 — *Cubre reclutamiento de seguridad*
- ⚑ Opinión positiva INFONAVIT — *No cubre subcontratistas — punto 4.2 lo exige* + botón "Actualizar"
- ✗ Estado de cuenta bancario — *Capital mínimo $18.7M — punto 6.8* + botón "Subir PDF"
- ✗ Fianza de sostenimiento — *5% del monto · Emitida SHCP · Punto 5.3* + botón "Subir PDF"

**Barra de progreso**: 60% → al hacer click en "Subir PDF" en la demo, simula carga y sube a 100% automáticamente.

**Al llegar al 100%:** botón `📦 Generar mi Expediente de Propuesta →` se habilita.

---

### Fase 6 — Expediente y Paquete de Victoria

**6A — War Room:**
Tabla con 3 competidores reales (datos simulados pero verosímiles):
- GSI – Grupo Seguridad Integral: 14 contratos, $118.4M prom.
- Securitas México: 9 contratos, $115.2M prom.
- Pryse México: 6 contratos, $109.8M prom.

**6B — Price to Win:**
- Agresivo: $99.6M · Margen 8%
- Óptimo ★: $109.6M · Margen 12% *(destacado)*
- Conservador: $118.3M · Margen 15%

**6C — El Paquete de Victoria:**
5 archivos del ZIP listados con estado ✓:
- portada.txt
- 01_checklist_cumplimiento.txt — 5/5 documentos cubiertos
- 02_propuesta_tecnica.txt — Borrador IA revisado
- 03_propuesta_economica.txt — PTW Óptimo $109.6M
- 04_pendientes.txt — Todo en orden · 100%

Botón de descarga: `⬇ Descargar expediente_IMSS0GYR.zip`

**Disclaimer completo** (antes del botón de descarga):
> *"Este expediente es una guía preparada con inteligencia artificial como herramienta de apoyo. LICIT-IA no garantiza adjudicación ni se responsabiliza por el resultado del proceso licitatorio. El contenido debe ser revisado y validado por el área jurídica y directiva de su empresa antes de presentarse ante la dependencia. La responsabilidad de la presentación recae exclusivamente en el participante."*

**Mensaje final**: *"De 0 a expediente completo en menos de 10 minutos. Tu equipo habría tardado 3 semanas."*

---

## App Alignment (cambios paralelos a la demo)

Estos cambios se implementan al mismo tiempo que la demo para mantener la alineación total:

### `backend/app/api/expediente.py` — `_generar_portada`

Agregar el disclaimer al final de `portada.txt`:

```
---
AVISO LEGAL
Este expediente es una guía preparada con inteligencia artificial como herramienta de apoyo.
LICIT-IA no garantiza adjudicación ni se responsabiliza por el resultado del proceso licitatorio.
El contenido debe ser revisado y validado por el área jurídica y directiva de su empresa
antes de presentarse ante la dependencia. La responsabilidad de la presentación recae
exclusivamente en el participante.
```

### `frontend/src/app/(app)/expediente/[id]/page.tsx`

Agregar bloque de disclaimer antes del botón "Descargar ZIP":

```tsx
<p className="text-xs text-gray-600 text-center max-w-lg mx-auto">
  Este expediente es una guía de apoyo generada con IA. Debe ser revisado por el área
  jurídica antes de presentarse. La responsabilidad de la presentación recae exclusivamente
  en el participante.
</p>
```

### `frontend/src/app/(app)/vault/page.tsx`

Ajustar el mensaje de privacidad existente para agregar el disclaimer de responsabilidad al fondo de la página.

### `backend/app/services/analisis_service.py` — ROI_FIJO

El valor ya es correcto ($25,200 MXN / 180 segundos). La demo debe usar exactamente estos números.

---

## Demo Data

Licitación de referencia para toda la demo:
```
numero: "IMSS-00-GYR-LAOS-001/2025"
titulo: "Servicio de Seguridad Intramuros — 18 UMAE Región Centro-Sur"
dependencia: "Instituto Mexicano del Seguro Social (IMSS)"
monto: 124_500_000
nivel_complejidad: "oro"
score_viabilidad: 92
ptw_agresivo: 99_600_000   // 80% del monto
ptw_optimo: 109_560_000    // 88% del monto
ptw_conservador: 118_275_000  // 95% del monto
roi_segundos: 180
roi_ahorro_mxn: 25_200
```

---

## Testing de Aceptación (post-lanzamiento)

Antes de presentar la demo a clientes reales, correr el sistema con 3–5 licitaciones reales de CompraNet y medir:
1. ¿Cuántos archivos genera el ZIP? ¿El checklist refleja los docs reales exigidos?
2. ¿El score de viabilidad es coherente con la complejidad de la licitación?
3. ¿Los puntos críticos coinciden con los requisitos de descalificación de las bases?
4. ¿El PTW es competitivo vs adjudicaciones históricas de esa dependencia?

Los resultados de este testing definen si la demo es honesta o requiere ajustes antes del lanzamiento comercial.

---

## Out of Scope

- Pasarela de pago real en la demo (botón simula pago directo)
- Upload real de documentos en la demo (botón simula carga)
- Descarga real del ZIP en la demo (botón muestra mensaje de confirmación)
- Análisis con PEMEX o CFE (marcados como "Próximamente")
- Versión mobile-first de la demo (desktop prioritario para reuniones de ventas)
