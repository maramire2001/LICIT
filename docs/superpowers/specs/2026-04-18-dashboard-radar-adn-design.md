# Dashboard Radar ADN — Design Spec

## Goal

Personalizar el dashboard de licitaciones para que cada empresa vea primero las oportunidades que coinciden con su perfil ADN, con posibilidad de búsqueda libre en cualquier momento.

## Architecture

Dos modos en el mismo dashboard, sin pantallas separadas. El cambio de modo es automático según el estado del campo de búsqueda:

- **Modo Radar** (default, campo vacío): llama a `GET /api/licitaciones/radar`. Resultados ordenados por relevancia DESC. Badge verde en tarjetas con score > 0.
- **Modo Búsqueda** (campo con texto): llama a `GET /api/licitaciones/?q=texto`. Resultados sin badge de relevancia, ordenados por fecha.

## Tech Stack

- FastAPI + SQLAlchemy async (backend)
- PostgreSQL con ILIKE para matching de texto
- Next.js 16 App Router, React, TypeScript (frontend)
- Debounce de 400ms en búsqueda libre para evitar llamadas excesivas

---

## Backend

### 1. `GET /api/licitaciones/radar`

**Endpoint nuevo.** Requiere usuario autenticado. Lee el perfil ADN de la empresa del usuario (`company_id`).

**Scoring por licitación (score 0–3):**

| Criterio | Puntos | Lógica |
|---|---|---|
| Institución prioritaria | +1 | `dependencia ILIKE '%{inst}%'` para cada valor en `company.prioridades_instituciones` |
| Rango financiero | +1 | `monto_estimado` cae dentro del rango definido por `company.rango_financiero` |
| Sector / keywords | +1 | `titulo ILIKE '%{sector}%'` usando `company.sector` |

**Mapeo de `rango_financiero` a montos:**

| Valor ADN | Rango MXN |
|---|---|
| `<$5M` | 0 – 5,000,000 |
| `$5M-$20M` | 5,000,000 – 20,000,000 |
| `$20M-$100M` | 20,000,000 – 100,000,000 |
| `$100M+` | 100,000,000+ |

**Comportamiento sin perfil:** Si `company` no tiene `prioridades_instituciones`, `rango_financiero`, ni `sector` configurados, devuelve todas las licitaciones activas con `score_relevancia=0` y `sin_perfil=True` en la respuesta.

**Respuesta:** Lista de `LicitacionResponse` con campo adicional `score_relevancia: int` (0–3). Ordenada por `score_relevancia DESC, created_at DESC`. `page_size` = 30, `estado = "activa"`.

**Response wrapper:**
```json
{
  "sin_perfil": false,
  "resultados": [ { ...LicitacionResponse, "score_relevancia": 2 } ]
}
```

### 2. `GET /api/licitaciones/` — agregar param `q`

Agrega query param opcional `q: str = Query(None)`. Cuando viene:
- `WHERE (titulo ILIKE '%{q}%' OR dependencia ILIKE '%{q}%') AND estado = {estado}`

Cuando no viene, comportamiento igual al actual. Mantiene `page`, `page_size`, `estado`.

---

## Frontend

### `frontend/src/lib/api.ts`

Agregar al objeto `licitaciones`:
- `radar(): Promise<RadarResponse>` — GET `/api/licitaciones/radar`
- Modificar `list(params?)` para aceptar `q?: string` opcional

Tipos nuevos en `frontend/src/types/index.ts`:
```typescript
type RadarResponse = {
  sin_perfil: boolean
  resultados: LicitacionConScore[]
}

type LicitacionConScore = Licitacion & { score_relevancia: number }
```

### `frontend/src/app/(app)/dashboard/page.tsx`

**Estado nuevo:**
- `query: string` — valor del campo de búsqueda
- `sinPerfil: boolean` — viene del radar response
- `companyNombre: string` — nombre de la empresa para el header

**Lógica de modo:**
- `query === ""` → llama `api.licitaciones.radar()`, setea `licitaciones` con `resultados`, setea `sinPerfil`
- `query !== ""` → llama `api.licitaciones.list({ q: query })` con debounce 400ms

**Header:**
- Título: `"Radar · {companyNombre}"` (si nombre disponible) o `"LICIT-IA"` (fallback)
- Subtítulo: `"Oportunidades filtradas por tu ADN"` en modo Radar / `"Búsqueda libre"` en modo Búsqueda

**Campo de búsqueda:** Input text siempre visible debajo del header. Placeholder: `"Buscar licitaciones por nombre o dependencia..."`. Al escribir, cambia a modo búsqueda automáticamente.

**Empty states:**
- Modo Radar sin resultados + sin_perfil=false: `"No hay licitaciones activas que coincidan con tu perfil."` + botón `"Buscar todas"` que limpia query y recarga radar en modo sin filtro.
- Modo Radar sin resultados + sin_perfil=true: `"Completa tu perfil ADN para ver oportunidades personalizadas."` + Link a `/onboarding`.
- Modo Búsqueda sin resultados: `"Sin resultados para '{query}'."`.

**Nombre de empresa:** Se obtiene de `api.auth.me()` (ya existe). Leer `company?.nombre`.

### `frontend/src/components/dashboard/LicitacionCard.tsx`

Acepta nueva prop opcional `relevancia?: number`. Cuando `relevancia > 0`:
- Muestra un punto verde (`w-2 h-2 rounded-full bg-green-400`) junto al estado de la tarjeta
- Tooltip nativo (`title="Coincide con tu perfil ADN"`) en el punto

No cambia nada más de la card — el badge es sutil, no invasivo.

---

## UX checklist implícito

- [ ] Estado de carga con skeletons en ambos modos
- [ ] Debounce 400ms en búsqueda para no llamar en cada tecla
- [ ] El cambio de modo no produce parpadeo — usa el mismo skeleton
- [ ] Si el usuario borra la búsqueda, vuelve al radar automáticamente
- [ ] El nombre de empresa tiene fallback para cuando no cargó aún

---

## Out of scope

- Búsqueda semántica por embeddings (placeholder en el modelo, no implementado)
- Filtros adicionales en UI (por dependencia, monto, fecha) — se agregan después
- Paginación del radar — 30 resultados son suficientes para el primer cliente
