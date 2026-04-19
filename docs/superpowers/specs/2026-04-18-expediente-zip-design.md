# Expediente ZIP — Design Spec

## Goal

Permitir que el cliente descargue un ZIP con el mapa de cumplimiento de su expediente: qué documento cubre qué requisito, qué necesita revisión humana, y las propuestas técnica y económica, todo organizado para guiar la entrega al portal de licitación.

## Architecture

Backend genera el ZIP en memoria con Python `zipfile` — sin archivos en disco ni en Supabase. Devuelve `StreamingResponse`. Frontend dispara la descarga con un blob URL. Los flags ⚑ se calculan cruzando vault docs cubiertos contra `riesgos` del análisis — sin llamadas adicionales a IA.

## Tech Stack

FastAPI `StreamingResponse`, Python `zipfile` + `io.BytesIO`, Next.js fetch + `URL.createObjectURL`, TypeScript.

---

## ZIP Contents

Cinco archivos de texto en la raíz del ZIP, nombrados con prefijo numérico para orden de lectura:

### `portada.txt`
```
EXPEDIENTE LICIT-IA
Empresa: {company.nombre}
RFC: {company.rfc}
Versión: {expediente.version}
Generado: {fecha_actual}
```

### `01_checklist_cumplimiento.txt`
Por cada documento requerido por la licitación (de `vault.requerimiento`):
- `✓ {descripcion}` — si está cubierto y NO aparece en riesgos
- `⚑ {descripcion} — REQUIERE REVISIÓN: {texto_riesgo}` — si está cubierto pero se menciona en riesgos
- `✗ {descripcion} — FALTANTE` — si no está cubierto

Encabezado del archivo:
```
CHECKLIST DE CUMPLIMIENTO
Licitación: {analisis_id[:8].upper()}
Total requeridos: N  |  Cubiertos: X  |  Requieren revisión: Y  |  Faltantes: Z
```

### `02_propuesta_tecnica.txt`
Contenido de `expediente.propuesta_tecnica_draft` tal cual. Si es `None`, escribe: `[Propuesta técnica no generada — regresa al expediente y usa el editor IA]`

### `03_propuesta_economica.txt`
```
PROPUESTA ECONÓMICA
Monto propuesto (óptimo): {fmt(monto_propuesto)}
Price to Win conservador: {fmt(ptw_conservador)}
Price to Win óptimo:      {fmt(ptw_optimo)}
Price to Win agresivo:    {fmt(ptw_agresivo)}

Desglose:
{desglose items si existen}

Basado en análisis de adjudicaciones históricas para esta dependencia.
```

### `04_pendientes.txt`
Solo los items que requieren acción — ⚑ y ✗:
```
ACCIONES PENDIENTES ANTES DE ENVIAR
[⚑ REVISAR] {descripcion} — {texto_riesgo}
[✗ FALTA]   {descripcion}
```
Si no hay pendientes: `Todo en orden — expediente al 100% de cobertura documental.`

---

## Backend

### Endpoint: `GET /api/expediente/{analisis_id}/zip`

**File:** `backend/app/api/expediente.py`

**Auth:** `current_user: User = Depends(get_current_user)` + verifica `Expediente.company_id == current_user.company_id`

**Logic:**

```python
# 1. Fetch expediente
# 2. Fetch analisis (para PTW + riesgos + requisitos_criticos)
# 3. Fetch company (para nombre + RFC)
# 4. Fetch vault requerimiento (lista de docs requeridos con cubierto: bool)
# 5. Determinar flags:
#    - Para cada doc cubierto: buscar si algún riesgo en analisis.riesgos.items[] 
#      menciona el tipo o descripción del doc (case-insensitive substring)
#    - Si match → el doc es ⚑ con el texto del riesgo
# 6. Generar 5 archivos de texto en memoria
# 7. Empaquetar en BytesIO ZIP
# 8. Return StreamingResponse(iter([zip_bytes]), media_type="application/zip",
#      headers={"Content-Disposition": f"attachment; filename=expediente_{analisis_id_short}.zip"})
```

**Imports nuevos necesarios:**
```python
import io
import zipfile
from datetime import datetime
from app.models.analisis import Analisis
from app.models.company import Company
from app.api.vault import _extraer_docs_requeridos  # reusar la lógica existente
```

**Flag detection:** Para cada doc cubierto, iterar `analisis.riesgos.get("items", [])` y `analisis.requisitos_criticos.get("items", [])`. Si el `tipo` del doc o parte de su `descripcion` aparece en algún item (case-insensitive), ese doc es ⚑ y se anota con el texto del riesgo relevante.

**Nombre del ZIP:** `expediente_{str(analisis_id)[:8].upper()}.zip`

### Reusar `_extraer_docs_requeridos` de `vault.py`

La función ya existe en `backend/app/api/vault.py`. Para el endpoint ZIP, necesitamos la misma lista de docs requeridos + el estado cubierto. En lugar de duplicar, hacer el cross-reference directo en el endpoint:

1. Llamar la misma lógica que `GET /vault/requerimiento/{analisis_id}` — es decir, obtener `analisis.requisitos_criticos`, extraer tipos de docs, y cruzar con vault docs de la empresa.
2. Si `_extraer_docs_requeridos` no es importable (es función interna), replicar la lógica de cruce de tipos directamente en el endpoint ZIP (es pequeña — ~15 líneas).

---

## Frontend

### `frontend/src/lib/api.ts`

Agregar al objeto `expediente`:
```typescript
descargarZip: (analisis_id: string) =>
  fetch(`${API_URL}/api/expediente/${analisis_id}/zip`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
```

Pero como `apiFetch` no devuelve un `Response` raw (devuelve JSON), usar `fetch` directamente con el token:

```typescript
descargarZip: async (analisis_id: string) => {
  const token = await getToken()
  const res = await fetch(`${API_URL}/api/expediente/${analisis_id}/zip`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.blob()
},
```

### `frontend/src/app/(app)/expediente/[id]/page.tsx`

Agregar estado `descargando: boolean` y función `handleDescargar`:

```typescript
async function handleDescargar() {
  if (!expediente) return
  setDescargando(true)
  try {
    const blob = await api.expediente.descargarZip(expediente.analisis_id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expediente_${expediente.analisis_id.slice(0, 8).toUpperCase()}.zip`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    // show error — no silencioso
  } finally {
    setDescargando(false)
  }
}
```

Botón en el header del expediente, junto al link "← Dashboard":

```tsx
<button
  onClick={handleDescargar}
  disabled={descargando}
  className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
    descargando
      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
      : "bg-white text-gray-950 hover:bg-gray-100"
  }`}
>
  {descargando ? "Generando..." : "Descargar ZIP"}
</button>
```

---

## Error Handling

- Expediente no encontrado → 404 (ya existe)
- Analisis no encontrado → 404 con mensaje claro
- Error generando ZIP → 500 con mensaje `"Error al generar el expediente"`
- Frontend: mostrar `setError("No se pudo generar el expediente. Intenta de nuevo.")` en el estado de error existente

---

## Out of Scope

- Incluir los PDFs del vault en el ZIP (futuro)
- Generar DOCX o PDF formateado (futuro)
- Firma digital o foliado oficial (futuro)
- Guardar el ZIP en Supabase Storage (no necesario — se genera bajo demanda)
