# Expediente ZIP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que el cliente descargue un ZIP con el mapa de cumplimiento documental de su expediente — checklist por documento, propuesta técnica, propuesta económica, y lista de pendientes.

**Architecture:** Backend genera el ZIP en memoria con Python `zipfile` + `io.BytesIO` y lo devuelve como `StreamingResponse`. Las helpers de generación de texto son funciones puras testeables. Frontend usa `fetch` + `URL.createObjectURL` para disparar la descarga del navegador.

**Tech Stack:** FastAPI `StreamingResponse`, Python `zipfile` + `io`, Next.js fetch API, TypeScript.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `backend/app/api/expediente.py` | Modificar | Agregar helpers de texto + `GET /{analisis_id}/zip` |
| `backend/tests/test_expediente_zip.py` | Crear | Unit tests de las funciones puras de generación |
| `frontend/src/lib/api.ts` | Modificar | Agregar `expediente.descargarZip()` |
| `frontend/src/app/(app)/expediente/[id]/page.tsx` | Modificar | Agregar botón "Descargar ZIP" con estado y manejo de error |

---

## Task 1: Backend — helpers de texto + endpoint `/zip`

**Files:**
- Modify: `backend/app/api/expediente.py`
- Create: `backend/tests/test_expediente_zip.py`

### Contexto

`backend/app/api/expediente.py` actualmente tiene tres endpoints: `GET /{analisis_id}`, `PATCH /{expediente_id}/propuesta-tecnica`, y `POST /{expediente_id}/ai-refine`. Hay que agregar helpers de texto y el endpoint ZIP.

Los modelos relevantes:
- `Expediente`: `analisis_id`, `company_id`, `propuesta_tecnica_draft`, `propuesta_economica` (dict), `version`
- `Analisis`: `riesgos` (dict `{items: list[str]}`), `requisitos_criticos` (dict `{items: list[str]}`), `matriz_humana/materiales/financiera` (dict `{items: list[dict]}`), `price_to_win_conservador`, `ptw_optimo`, `ptw_agresivo`
- `Company`: `nombre`, `rfc`
- `VaultDocumento`: `tipo`, `vigente`

La función `_extraer_docs_requeridos` vive en `backend/app/api/vault.py` y es importable.

- [ ] **Step 1: Escribir los unit tests para los helpers**

Crear `backend/tests/test_expediente_zip.py`:

```python
from app.api.expediente import (
    _generar_portada,
    _generar_checklist,
    _generar_economica,
    _generar_pendientes,
)


def test_portada_contiene_empresa():
    result = _generar_portada("Empresa SA", "ABC123456789", 2, "A1B2C3D4")
    assert "Empresa SA" in result
    assert "ABC123456789" in result
    assert "v2" in result
    assert "A1B2C3D4" in result


def test_checklist_cubierto_sin_riesgo():
    docs = [{"tipo": "rfc", "descripcion": "Constancia RFC", "cubierto": True}]
    result = _generar_checklist(docs, [])
    assert "✓ Constancia RFC" in result
    assert "⚑" not in result
    assert "✗" not in result


def test_checklist_cubierto_con_riesgo():
    docs = [{"tipo": "fianza", "descripcion": "Póliza de fianza", "cubierto": True}]
    riesgos = ["La fianza debe ser emitida por institución autorizada por SHCP"]
    result = _generar_checklist(docs, riesgos)
    assert "⚑" in result
    assert "Póliza de fianza" in result
    assert "SHCP" in result


def test_checklist_faltante():
    docs = [{"tipo": "repse", "descripcion": "Registro REPSE", "cubierto": False}]
    result = _generar_checklist(docs, [])
    assert "✗" in result
    assert "Registro REPSE" in result


def test_checklist_conteo():
    docs = [
        {"tipo": "rfc", "descripcion": "RFC", "cubierto": True},
        {"tipo": "acta", "descripcion": "Acta", "cubierto": True},
        {"tipo": "repse", "descripcion": "REPSE", "cubierto": False},
    ]
    riesgos = ["La fianza debe tener vigencia de 6 meses"]
    result = _generar_checklist(docs, riesgos)
    assert "Total requeridos: 3" in result
    assert "Cubiertos: 2" in result
    assert "Faltantes: 1" in result


def test_economica_con_ptw():
    result = _generar_economica(
        {"monto_propuesto": 5_000_000, "desglose": []},
        ptw_conservador=4_500_000,
        ptw_optimo=5_000_000,
        ptw_agresivo=5_500_000,
    )
    assert "5,000,000" in result
    assert "4,500,000" in result
    assert "Conservador" in result


def test_economica_sin_monto():
    result = _generar_economica({"monto_propuesto": None, "desglose": []}, None, None, None)
    assert "—" in result


def test_pendientes_sin_problemas():
    docs = [{"tipo": "rfc", "descripcion": "RFC", "cubierto": True}]
    result = _generar_pendientes(docs, [])
    assert "100%" in result


def test_pendientes_con_faltante():
    docs = [{"tipo": "repse", "descripcion": "REPSE", "cubierto": False}]
    result = _generar_pendientes(docs, [])
    assert "[✗ FALTA]" in result
    assert "REPSE" in result


def test_pendientes_con_flag():
    docs = [{"tipo": "fianza", "descripcion": "Póliza de fianza", "cubierto": True}]
    riesgos = ["La fianza debe ser emitida por institución autorizada"]
    result = _generar_pendientes(docs, riesgos)
    assert "[⚑ REVISAR]" in result
```

- [ ] **Step 2: Ejecutar tests — verificar que fallan**

```bash
docker exec licit-ai-backend-1 python -m pytest tests/test_expediente_zip.py -v 2>&1 | head -20
```

Expected: `ImportError` — los helpers no existen aún.

- [ ] **Step 3: Implementar los helpers y el endpoint en `expediente.py`**

Agregar al inicio de `backend/app/api/expediente.py`, después de los imports existentes:

```python
import io
import zipfile
from datetime import datetime
from fastapi.responses import StreamingResponse
from app.models.analisis import Analisis
from app.models.company import Company
from app.models.vault import VaultDocumento
from app.api.vault import _extraer_docs_requeridos
```

Agregar las funciones puras ANTES de `router = APIRouter()`:

```python
def _fmt_mxn(n) -> str:
    if n is None:
        return "—"
    return f"${float(n):,.0f} MXN"


def _generar_portada(company_nombre: str, company_rfc: str, version: int, analisis_id_short: str) -> str:
    fecha = datetime.utcnow().strftime("%d/%m/%Y %H:%M UTC")
    return (
        f"EXPEDIENTE LICIT-IA\n"
        f"{'='*40}\n"
        f"Empresa:  {company_nombre}\n"
        f"RFC:      {company_rfc}\n"
        f"Análisis: {analisis_id_short}\n"
        f"Versión:  v{version}\n"
        f"Generado: {fecha}\n"
    )


def _flag_doc(doc: dict, riesgos_items: list[str]) -> str | None:
    """Devuelve el texto del riesgo si el doc está flaggeado, None si no."""
    palabras = [w for w in doc["descripcion"].lower().split() if len(w) > 4]
    for riesgo in riesgos_items:
        riesgo_lower = riesgo.lower()
        if doc["tipo"].lower() in riesgo_lower or any(w in riesgo_lower for w in palabras):
            return riesgo
    return None


def _generar_checklist(docs_requeridos: list[dict], riesgos_items: list[str]) -> str:
    cubiertos = [d for d in docs_requeridos if d["cubierto"]]
    faltantes = [d for d in docs_requeridos if not d["cubierto"]]

    flagged = [(d, _flag_doc(d, riesgos_items)) for d in cubiertos]
    ok = [d for d, f in flagged if f is None]
    con_flag = [(d, f) for d, f in flagged if f is not None]

    n_total = len(docs_requeridos)
    n_cubiertos = len(cubiertos)
    n_flagged = len(con_flag)
    n_faltantes = len(faltantes)

    lines = [
        "CHECKLIST DE CUMPLIMIENTO",
        "=" * 40,
        f"Total requeridos: {n_total}  |  Cubiertos: {n_cubiertos}  |  Requieren revisión: {n_flagged}  |  Faltantes: {n_faltantes}",
        "",
    ]
    if ok:
        lines.append("✓ DOCUMENTOS CUBIERTOS")
        for d in ok:
            lines.append(f"  ✓ {d['descripcion']}")
        lines.append("")
    if con_flag:
        lines.append("⚑ REQUIEREN REVISIÓN ANTES DE ENVIAR")
        for d, f in con_flag:
            lines.append(f"  ⚑ {d['descripcion']}")
            lines.append(f"    → {f}")
        lines.append("")
    if faltantes:
        lines.append("✗ DOCUMENTOS FALTANTES")
        for d in faltantes:
            lines.append(f"  ✗ {d['descripcion']}")
    return "\n".join(lines)


def _generar_economica(propuesta_economica: dict, ptw_conservador, ptw_optimo, ptw_agresivo) -> str:
    monto = propuesta_economica.get("monto_propuesto")
    desglose = propuesta_economica.get("desglose", [])
    lines = [
        "PROPUESTA ECONÓMICA",
        "=" * 40,
        f"Monto propuesto (óptimo): {_fmt_mxn(monto)}",
        "",
        "Price to Win:",
        f"  Conservador: {_fmt_mxn(ptw_conservador)}",
        f"  Óptimo:      {_fmt_mxn(ptw_optimo)}",
        f"  Agresivo:    {_fmt_mxn(ptw_agresivo)}",
        "",
    ]
    if desglose:
        lines.append("Desglose:")
        for item in desglose:
            lines.append(f"  - {item}")
        lines.append("")
    lines.append("Basado en análisis de adjudicaciones históricas para esta dependencia.")
    return "\n".join(lines)


def _generar_pendientes(docs_requeridos: list[dict], riesgos_items: list[str]) -> str:
    flagged_lines = []
    faltantes_lines = []
    for d in docs_requeridos:
        if not d["cubierto"]:
            faltantes_lines.append(f"[✗ FALTA]   {d['descripcion']}")
        else:
            f = _flag_doc(d, riesgos_items)
            if f:
                flagged_lines.append(f"[⚑ REVISAR] {d['descripcion']}\n           → {f}")

    if not flagged_lines and not faltantes_lines:
        return "ACCIONES PENDIENTES\n" + "=" * 40 + "\n\nTodo en orden — expediente al 100% de cobertura documental."

    lines = ["ACCIONES PENDIENTES ANTES DE ENVIAR", "=" * 40, ""]
    lines.extend(flagged_lines)
    if flagged_lines and faltantes_lines:
        lines.append("")
    lines.extend(faltantes_lines)
    return "\n".join(lines)
```

Agregar el endpoint ZIP al final de `expediente.py`, después del endpoint `ai-refine`:

```python
@router.get("/{analisis_id}/zip")
async def descargar_zip(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exp_result = await db.execute(
        select(Expediente).where(
            Expediente.analisis_id == analisis_id,
            Expediente.company_id == current_user.company_id,
        )
    )
    exp = exp_result.scalar_one_or_none()
    if not exp:
        raise HTTPException(404, "Expediente no encontrado")

    analisis_result = await db.execute(
        select(Analisis).where(Analisis.id == analisis_id)
    )
    analisis = analisis_result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")

    company_result = await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )
    company = company_result.scalar_one_or_none()
    if not company:
        raise HTTPException(500, "Perfil de empresa no encontrado")

    rc = analisis.requisitos_criticos or {}
    requisitos = rc.get("items", []) if isinstance(rc, dict) else []
    matrices_items: list = []
    for campo in [analisis.matriz_humana, analisis.matriz_materiales, analisis.matriz_financiera]:
        if isinstance(campo, dict):
            matrices_items.extend(campo.get("items", []))
    requeridos = _extraer_docs_requeridos(requisitos, matrices_items)

    vault_result = await db.execute(
        select(VaultDocumento).where(
            VaultDocumento.company_id == current_user.company_id,
            VaultDocumento.vigente == True,
        )
    )
    vault_tipos = {d.tipo for d in vault_result.scalars().all()}

    docs_requeridos = [
        {"tipo": r["tipo"], "descripcion": r["descripcion"], "cubierto": r["tipo"] in vault_tipos}
        for r in requeridos
    ]
    riesgos_items: list[str] = (analisis.riesgos or {}).get("items", [])
    analisis_id_short = str(analisis_id)[:8].upper()

    portada = _generar_portada(company.nombre, company.rfc, exp.version, analisis_id_short)
    checklist = _generar_checklist(docs_requeridos, riesgos_items)
    tecnica = exp.propuesta_tecnica_draft or (
        "[Propuesta técnica no generada — regresa al expediente y usa el editor IA]"
    )
    economica = _generar_economica(
        exp.propuesta_economica or {},
        analisis.price_to_win_conservador,
        analisis.ptw_optimo,
        analisis.ptw_agresivo,
    )
    pendientes = _generar_pendientes(docs_requeridos, riesgos_items)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("portada.txt", portada)
        zf.writestr("01_checklist_cumplimiento.txt", checklist)
        zf.writestr("02_propuesta_tecnica.txt", tecnica)
        zf.writestr("03_propuesta_economica.txt", economica)
        zf.writestr("04_pendientes.txt", pendientes)
    buf.seek(0)

    filename = f"expediente_{analisis_id_short}.zip"
    return StreamingResponse(
        iter([buf.read()]),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
```

- [ ] **Step 4: Ejecutar tests — verificar que pasan**

```bash
docker exec licit-ai-backend-1 python -m pytest tests/test_expediente_zip.py -v
```

Expected:
```
test_expediente_zip.py::test_portada_contiene_empresa PASSED
test_expediente_zip.py::test_checklist_cubierto_sin_riesgo PASSED
test_expediente_zip.py::test_checklist_cubierto_con_riesgo PASSED
test_expediente_zip.py::test_checklist_faltante PASSED
test_expediente_zip.py::test_checklist_conteo PASSED
test_expediente_zip.py::test_economica_con_ptw PASSED
test_expediente_zip.py::test_economica_sin_monto PASSED
test_expediente_zip.py::test_pendientes_sin_problemas PASSED
test_expediente_zip.py::test_pendientes_con_faltante PASSED
test_expediente_zip.py::test_pendientes_con_flag PASSED
10 passed
```

- [ ] **Step 5: Verificar que el módulo importa limpio**

```bash
docker exec licit-ai-backend-1 python -c "from app.api.expediente import router; print('OK')"
```

Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/expediente.py backend/tests/test_expediente_zip.py
git commit -m "feat: add ZIP download endpoint with compliance checklist"
```

---

## Task 2: Frontend — botón de descarga + api method

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/(app)/expediente/[id]/page.tsx`

### Contexto

`api.ts` usa `apiFetch<T>` que devuelve JSON. Para el ZIP necesitamos el `Response` raw (blob), así que usamos `fetch` directamente con el token — igual que `subirComprobante`.

`expediente/[id]/page.tsx` tiene un header con `h1` y un `Link` "← Dashboard". El botón de descarga va en ese header, junto al link. El estado de error existente (`setError`) ya está disponible para mostrar fallos.

El expediente se carga via `params.id` que es el `analisis_id` (no el `expediente.id`). El endpoint ZIP recibe `analisis_id`. La descarga dispara el archivo con nombre `expediente_{analisis_id[:8].upper()}.zip`.

- [ ] **Step 1: Agregar `descargarZip` a `frontend/src/lib/api.ts`**

Agregar al objeto `expediente` en `api`:

```typescript
descargarZip: async (analisis_id: string) => {
  const token = await getToken()
  const res = await fetch(
    `${API_URL}/api/expediente/${analisis_id}/zip`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  )
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.blob()
},
```

El bloque `expediente` completo queda:

```typescript
expediente: {
  get: (analisis_id: string) => apiFetch<any>(`/api/expediente/${analisis_id}`),
  updatePropuesta: (expediente_id: string, text: string) =>
    apiFetch<any>(`/api/expediente/${expediente_id}/propuesta-tecnica`, {
      method: "PATCH",
      body: JSON.stringify({ propuesta_tecnica_draft: text }),
    }),
  aiRefine: (expediente_id: string, instruccion: string) =>
    apiFetch<any>(
      `/api/expediente/${expediente_id}/ai-refine?instruccion=${encodeURIComponent(instruccion)}`,
      { method: "POST" }
    ),
  descargarZip: async (analisis_id: string) => {
    const token = await getToken()
    const res = await fetch(
      `${API_URL}/api/expediente/${analisis_id}/zip`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    )
    if (!res.ok) throw new Error(`Error ${res.status}`)
    return res.blob()
  },
},
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | head -10
```

Expected: sin errores.

- [ ] **Step 3: Agregar estado y función de descarga en `expediente/[id]/page.tsx`**

Agregar `descargando: boolean` y `errorDescarga: string` al estado existente (después de `const [error, setError] = useState("")`):

```tsx
const [descargando, setDescargando] = useState(false)
const [errorDescarga, setErrorDescarga] = useState("")
```

Agregar la función `handleDescargar` (antes del `return`):

```tsx
async function handleDescargar() {
  if (!expediente) return
  setDescargando(true)
  setErrorDescarga("")
  try {
    const blob = await api.expediente.descargarZip(expediente.analisis_id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expediente_${expediente.analisis_id.slice(0, 8).toUpperCase()}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    setErrorDescarga("No se pudo generar el expediente. Intenta de nuevo.")
  } finally {
    setDescargando(false)
  }
}
```

- [ ] **Step 4: Agregar el botón en el header y el mensaje de error**

Localizar el header existente:
```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 ...>Expediente v{expediente.version}</h1>
    <p ...>Revisión y ajuste...</p>
  </div>
  <Link href="/dashboard" ...>← Dashboard</Link>
</div>
```

Reemplazar con:
```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-xl font-bold text-white">
      Expediente v{expediente.version}
    </h1>
    <p className="text-gray-500 text-sm mt-0.5">
      Revisión y ajuste del borrador generado por IA
    </p>
  </div>
  <div className="flex items-center gap-3">
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
    <Link
      href="/dashboard"
      className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
    >
      ← Dashboard
    </Link>
  </div>
</div>
```

Agregar el mensaje de error de descarga justo después del header (antes de `<VaultGap>`):
```tsx
{errorDescarga && (
  <p className="text-red-400 text-sm mb-4 text-center">{errorDescarga}</p>
)}
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | head -10
```

Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/app/\(app\)/expediente/\[id\]/page.tsx
git commit -m "feat: add ZIP download button to expediente page"
```

---

## Self-Review

**Spec coverage:**
- ✅ `portada.txt` con empresa, RFC, versión, fecha — `_generar_portada`
- ✅ `01_checklist_cumplimiento.txt` con ✓/⚑/✗ y conteo — `_generar_checklist`
- ✅ Flags ⚑ cruzando vault docs cubiertos vs riesgos del análisis — `_flag_doc`
- ✅ `02_propuesta_tecnica.txt` con fallback si es None — endpoint
- ✅ `03_propuesta_economica.txt` con PTW — `_generar_economica`
- ✅ `04_pendientes.txt` solo ⚑ y ✗ — `_generar_pendientes`
- ✅ ZIP en memoria con `BytesIO` — endpoint
- ✅ `StreamingResponse` con `Content-Disposition` — endpoint
- ✅ Auth + company_id check — endpoint
- ✅ `descargarZip()` en api.ts con fetch raw + blob — Task 2
- ✅ Botón "Descargar ZIP" con estado "Generando..." — Task 2
- ✅ Error de descarga visible en UI — Task 2
- ✅ Nombre del ZIP `expediente_{analisis_id[:8].upper()}.zip` — Task 2

**Type consistency:**
- `_flag_doc` devuelve `str | None` — usado consistentemente en `_generar_checklist` y `_generar_pendientes`
- `docs_requeridos` es `list[dict]` con keys `tipo`, `descripcion`, `cubierto` — consistente en todas las funciones
- `expediente.analisis_id` (string en frontend, UUID en backend) — el endpoint recibe `analisis_id: uuid.UUID` vía path param, FastAPI lo convierte automáticamente
