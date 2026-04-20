# Acceso Inmediato con Comprobante — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El cliente sube su comprobante de transferencia y obtiene acceso inmediato al expediente; el admin puede bloquear el acceso desde la consola si el pago no se acredita.

**Architecture:** (1) Migración agrega `comprobante_url` a analisis. (2) El endpoint `notificar` ahora exige comprobante previo y setea `pago_status='confirmado'` directo. (3) Nuevo endpoint `POST /comprobante/{id}` sube archivo a Supabase Storage (bucket "vault", carpeta "comprobantes/"). (4) Nuevo endpoint `POST /bloquear/{id}` para admin. (5) El admin panel muestra pagos confirmados con link al comprobante y botón bloquear. (6) La página de pago agrega el paso de upload antes del botón final.

**Tech Stack:** FastAPI, SQLAlchemy async, Alembic, Supabase Storage (Python), Next.js 16 + TailwindCSS 4.

**pago_status values:**
- `pendiente` → no ha pagado
- `confirmado` → comprobante subido, acceso activo
- `bloqueado` → admin revocó acceso (pago no acreditado)

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `backend/alembic/versions/005_comprobante_url.py` | Crear | Migración — agrega comprobante_url |
| `backend/app/models/analisis.py` | Modificar | Campo comprobante_url |
| `backend/app/schemas/analisis.py` | Modificar | Exponer comprobante_url |
| `backend/app/api/pagos.py` | Modificar | Nuevos endpoints: comprobante, bloquear; modificar notificar |
| `frontend/src/lib/api.ts` | Modificar | Métodos pagos.subirComprobante, pagos.bloquear; actualizar pendientes→recientes |
| `frontend/src/app/(app)/pago/[id]/page.tsx` | Modificar | Agregar step de upload comprobante |
| `frontend/src/app/(app)/admin/pagos/page.tsx` | Modificar | Mostrar recientes + comprobante link + botón bloquear |

---

## Task 1: Migración + modelo + schema

**Files:**
- Create: `backend/alembic/versions/005_comprobante_url.py`
- Modify: `backend/app/models/analisis.py`
- Modify: `backend/app/schemas/analisis.py`

- [ ] **Step 1: Crear migración**

```python
# backend/alembic/versions/005_comprobante_url.py
"""add comprobante_url to analisis

Revision ID: 005
Revises: 004
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column(
        "analisis",
        sa.Column("comprobante_url", sa.Text, nullable=True),
    )

def downgrade():
    op.drop_column("analisis", "comprobante_url")
```

- [ ] **Step 2: Correr migración**

```bash
docker exec licit-ai-backend-1 alembic upgrade head
```

Salida esperada: `Running upgrade 004 -> 005`

- [ ] **Step 3: Agregar campo al modelo**

En `backend/app/models/analisis.py`, agregar después de `pago_monto`:

```python
    comprobante_url: Mapped[str | None] = mapped_column(Text, nullable=True)
```

El import de `Text` no está en este archivo — agregar al import existente:

```python
from sqlalchemy import String, Numeric, DateTime, JSON, Text
```

- [ ] **Step 4: Exponer en schema**

En `backend/app/schemas/analisis.py`, agregar después de `pago_status`:

```python
    comprobante_url: str | None = None
```

- [ ] **Step 5: Verificar**

```bash
docker exec licit-ai-backend-1 python -c "
from app.models.analisis import Analisis
from app.schemas.analisis import AnalisisResponse
print('modelo OK:', hasattr(Analisis, 'comprobante_url'))
print('schema OK:', 'comprobante_url' in AnalisisResponse.model_fields)
"
```

Salida esperada:
```
modelo OK: True
schema OK: True
```

- [ ] **Step 6: Commit**

```bash
git add backend/alembic/versions/005_comprobante_url.py backend/app/models/analisis.py backend/app/schemas/analisis.py
git commit -m "feat: add comprobante_url field to analisis for transfer receipt storage"
```

---

## Task 2: Backend — actualizar pagos.py

**Files:**
- Modify: `backend/app/api/pagos.py`

Leer el archivo completo antes de editar. Los cambios son:

1. Agregar endpoint `POST /comprobante/{analisis_id}` — sube archivo a Supabase Storage
2. Modificar `notificar` — ahora requiere comprobante_url y setea 'confirmado' directo
3. Agregar endpoint `POST /bloquear/{analisis_id}` — admin revoca acceso
4. Modificar `GET /pendientes` → `GET /recientes` — muestra 'confirmado' con comprobante

- [ ] **Step 1: Agregar import de supabase**

En `backend/app/api/pagos.py`, agregar al tope después de los imports existentes:

```python
from fastapi import UploadFile, File
from app.core.supabase import get_supabase
```

Verificar que `get_supabase` existe:
```bash
docker exec licit-ai-backend-1 python -c "from app.core.supabase import get_supabase; print('OK')"
```

Si no existe, usar el patrón del vault.py — leer `backend/app/api/vault.py` para ver cómo importa supabase y replicar ese mismo import.

- [ ] **Step 2: Agregar endpoint `POST /comprobante/{analisis_id}`**

Agregar ANTES del endpoint `notificar`:

```python
@router.post("/comprobante/{analisis_id}")
async def subir_comprobante(
    analisis_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """El cliente sube el comprobante de transferencia bancaria."""
    if not current_user.company_id:
        raise HTTPException(400, "Completa el onboarding primero")

    result = await db.execute(
        select(Analisis).where(
            Analisis.id == analisis_id,
            Analisis.company_id == current_user.company_id,
        )
    )
    analisis = result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")
    if analisis.pago_status == "bloqueado":
        raise HTTPException(403, "Acceso bloqueado. Contacta al administrador.")

    content = await file.read()
    ext = (file.filename or "comprobante.pdf").rsplit(".", 1)[-1]
    path = f"comprobantes/{analisis_id}/{analisis_id}.{ext}"

    supabase = get_supabase()
    supabase.storage.from_("vault").upload(
        path, content, {"content-type": file.content_type or "application/octet-stream", "upsert": "true"}
    )
    url = supabase.storage.from_("vault").get_public_url(path)

    analisis.comprobante_url = url
    await db.commit()
    return {"comprobante_url": url}
```

- [ ] **Step 3: Modificar `notificar` para acceso inmediato**

Reemplazar el cuerpo completo del endpoint `notificar_transferencia` por:

```python
@router.post("/notificar/{analisis_id}")
async def notificar_transferencia(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """El cliente confirma transferencia. Requiere comprobante previo. Otorga acceso inmediato."""
    result = await db.execute(
        select(Analisis).where(
            Analisis.id == analisis_id,
            Analisis.company_id == current_user.company_id,
        )
    )
    analisis = result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")
    if analisis.pago_status == "bloqueado":
        raise HTTPException(403, "Acceso bloqueado. Contacta al administrador.")
    if analisis.pago_status == "confirmado":
        return {"status": "confirmado", "monto": int(analisis.pago_monto) if analisis.pago_monto else None}
    if not analisis.comprobante_url:
        raise HTTPException(400, "Sube el comprobante de transferencia antes de confirmar")

    company_result = await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )
    company = company_result.scalar_one_or_none()
    if not company:
        raise HTTPException(500, "Perfil de empresa no encontrado")
    tipo_plan = company.tipo_plan
    monto = _calcular_monto(analisis.nivel_complejidad, tipo_plan)

    analisis.pago_status = "confirmado"
    analisis.pago_monto = monto
    await db.commit()
    return {"status": "confirmado", "monto": monto}
```

- [ ] **Step 4: Agregar endpoint `POST /bloquear/{analisis_id}`**

Agregar DESPUÉS del endpoint `confirmar_pago` existente (o reemplazarlo — leer el archivo para decidir):

```python
@router.post("/bloquear/{analisis_id}")
async def bloquear_pago(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin revoca el acceso cuando el pago no se acredita."""
    if not _is_admin(current_user):
        raise HTTPException(403, "Solo el administrador puede bloquear pagos")

    result = await db.execute(
        select(Analisis).where(Analisis.id == analisis_id)
    )
    analisis = result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")

    analisis.pago_status = "bloqueado"
    await db.commit()
    return {"status": "bloqueado"}
```

- [ ] **Step 5: Modificar `GET /pendientes` → `GET /recientes`**

Cambiar el endpoint `listar_pendientes`:
- Renombrar función a `listar_recientes`
- Cambiar path de `"/pendientes"` a `"/recientes"`
- Filtrar por `Analisis.pago_status == "confirmado"` en lugar de `"en_revision"`
- Agregar `comprobante_url` al resultado:

```python
@router.get("/recientes")
async def listar_recientes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin: lista de análisis con pago confirmado (comprobante subido)."""
    if not _is_admin(current_user):
        raise HTTPException(403, "Solo el administrador puede ver pagos")

    result = await db.execute(
        select(Analisis).where(Analisis.pago_status == "confirmado")
    )
    analisis_list = result.scalars().all()

    return [
        {
            "analisis_id": str(a.id),
            "company_id": str(a.company_id),
            "nivel_complejidad": a.nivel_complejidad,
            "pago_monto": int(a.pago_monto) if a.pago_monto else None,
            "pago_status": a.pago_status,
            "comprobante_url": a.comprobante_url,
            "created_at": a.created_at.isoformat(),
        }
        for a in analisis_list
    ]
```

- [ ] **Step 6: Verificar**

```bash
docker exec licit-ai-backend-1 python -c "from app.api.pagos import router; print('OK')"
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/pagos.py
git commit -m "feat: immediate access on comprobante upload, add bloquear endpoint, rename pendientes to recientes"
```

---

## Task 3: Frontend — api.ts + pago page + admin panel

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/(app)/pago/[id]/page.tsx`
- Modify: `frontend/src/app/(app)/admin/pagos/page.tsx`

### Parte A: api.ts

- [ ] **Step 1: Leer api.ts**

Leer `frontend/src/lib/api.ts` para entender la estructura del objeto `pagos`.

- [ ] **Step 2: Agregar `subirComprobante` y `bloquear`, actualizar `pendientes` → `recientes`**

En el objeto `pagos`:

Agregar después de `notificar`:
```typescript
subirComprobante: (analisis_id: string, file: File, token: string) => {
  const formData = new FormData()
  formData.append("file", file)
  return fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/pagos/comprobante/${analisis_id}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData }
  ).then(async (res) => {
    if (!res.ok) throw new Error(`Error ${res.status}`)
    return res.json() as Promise<{ comprobante_url: string }>
  })
},
bloquear: (analisis_id: string) =>
  apiFetch<{ status: string }>(`/api/pagos/bloquear/${analisis_id}`, {
    method: "POST",
  }),
recientes: () =>
  apiFetch<
    {
      analisis_id: string
      company_id: string
      nivel_complejidad: string
      pago_monto: number | null
      pago_status: string
      comprobante_url: string | null
      created_at: string
    }[]
  >("/api/pagos/recientes"),
```

Eliminar el método `pendientes` (ya no existe en el backend) o renombrarlo a `recientes`. Si hay otros lugares que llaman `api.pagos.pendientes`, actualizarlos.

### Parte B: Página de pago

- [ ] **Step 3: Leer pago page actual**

Leer `frontend/src/app/(app)/pago/[id]/page.tsx`

- [ ] **Step 4: Agregar estado de comprobante y upload**

El componente necesita nuevo estado y una sección de upload. Estos son los cambios exactos:

**Nuevos estados** (agregar junto a los existentes al tope del componente):
```tsx
const [comprobante, setComprobante] = useState<File | null>(null)
const [subiendo, setSubiendo] = useState(false)
const [comprobanteSubido, setComprobanteSubido] = useState(false)
const [supabaseSession, setSupabaseSession] = useState<string | null>(null)
```

**Cargar sesión de Supabase** (agregar junto al `useEffect` de fetchInfo):
```tsx
import { supabase } from "@/lib/supabase"

// dentro del componente, junto a los otros useEffects:
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSupabaseSession(data.session?.access_token ?? null)
  })
}, [])
```

**Función para subir comprobante** (agregar antes de `handleNotificar`):
```tsx
async function handleSubirComprobante() {
  if (!comprobante || !supabaseSession) return
  setSubiendo(true)
  try {
    await api.pagos.subirComprobante(id, comprobante, supabaseSession)
    setComprobanteSubido(true)
  } catch {
    setError("Error al subir el comprobante. Intenta de nuevo.")
  } finally {
    setSubiendo(false)
  }
}
```

**Modificar `handleNotificar`** — quitar el try/catch de subida (eso ya lo hace `handleSubirComprobante`), mantener solo la llamada a `notificar`:
```tsx
async function handleNotificar() {
  setNotificando(true)
  try {
    await api.pagos.notificar(id)
    setNotificado(true)
    setInfo((prev) => prev ? { ...prev, pago_status: "confirmado" } : prev)
    router.replace(`/expediente/${id}`)
  } catch {
    setError("Error al confirmar. Verifica que tu comprobante esté subido.")
  } finally {
    setNotificando(false)
  }
}
```

**Reemplazar la sección del CTA** (la parte con el botón "Ya realicé mi transferencia") con el flujo de dos pasos:

```tsx
{/* Step 1: Subir comprobante */}
<div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-3">
  <p className="text-white text-sm font-semibold">
    Paso 1 — Sube tu comprobante de transferencia
  </p>
  <p className="text-gray-500 text-xs">
    PDF, imagen o XML del comprobante bancario
  </p>
  {comprobanteSubido ? (
    <div className="flex items-center gap-2 text-green-400 text-xs">
      <span>✓</span>
      <span>Comprobante cargado correctamente</span>
    </div>
  ) : (
    <div className="space-y-2">
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.xml"
        onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
        className="text-gray-400 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600"
      />
      <button
        onClick={handleSubirComprobante}
        disabled={!comprobante || subiendo}
        className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
          !comprobante || subiendo
            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-gray-700 hover:bg-gray-600 text-white"
        }`}
      >
        {subiendo ? "Subiendo..." : "Subir comprobante"}
      </button>
    </div>
  )}
</div>

{/* Step 2: Confirmar y acceder */}
<button
  onClick={handleNotificar}
  disabled={!comprobanteSubido || notificando}
  className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors ${
    !comprobanteSubido || notificando
      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
      : "bg-white text-gray-950 hover:bg-gray-100"
  }`}
>
  {notificando ? "Procesando..." : "Confirmar y acceder al expediente →"}
</button>
```

Eliminar el bloque `{notificado ? ... : <button>Ya realicé mi transferencia</button>}` anterior — ya no se usa porque ahora `handleNotificar` redirige directo.

### Parte C: Admin panel

- [ ] **Step 5: Leer admin/pagos/page.tsx actual**

Leer `frontend/src/app/(app)/admin/pagos/page.tsx`

- [ ] **Step 6: Actualizar para usar `recientes` + `bloquear`**

Cambios exactos:
- En `cargar()`: cambiar `api.pagos.pendientes()` → `api.pagos.recientes()`
- En el tipo `PendientePago`: agregar `comprobante_url: string | null`
- En el botón per-row: cambiar texto "Confirmar pago" → "Bloquear acceso" y clase a `bg-red-700 hover:bg-red-800`
- En `confirmar()`: renombrar a `bloquear()`, cambiar `api.pagos.confirmar()` → `api.pagos.bloquear()`
- Agregar link al comprobante en cada row:

```tsx
{p.comprobante_url && (
  <a
    href={p.comprobante_url}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-400 text-xs hover:underline"
  >
    Ver comprobante →
  </a>
)}
```

- Cambiar el título de la página: "Pagos Confirmados — Monitoreo" y subtítulo "Bloquea si el pago no se acredita"

- [ ] **Step 7: TypeScript check**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | head -20
```

Sin errores nuevos.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/api.ts "frontend/src/app/(app)/pago/[id]/page.tsx" "frontend/src/app/(app)/admin/pagos/page.tsx"
git commit -m "feat: comprobante upload flow with immediate access + admin bloquear endpoint"
```

---

## Self-Review

**Spec coverage:**
- [x] Cliente sube comprobante → acceso inmediato → Task 2 (`notificar` setea 'confirmado') + Task 3 (upload en pago page)
- [x] Comprobante obligatorio antes de confirmar → Task 2 (validación en `notificar`) + Task 3 (botón deshabilitado)
- [x] Admin puede bloquear → Task 2 (`bloquear` endpoint) + Task 3 (admin panel)
- [x] Admin ve comprobante link → Task 2 (`recientes` incluye `comprobante_url`) + Task 3 (admin panel)
- [x] Estado 'bloqueado' redirige a `/pago/[id]` → Gate existente en expediente page ya lo maneja (verifica `!== 'confirmado'`)
- [x] Comprobante almacenado en Supabase Storage → Task 2 (bucket vault, carpeta comprobantes/)

**Placeholder scan:** Ninguno.

**Type consistency:** `comprobante_url: string | null` usado consistentemente en modelo, schema, api.ts y admin panel.
