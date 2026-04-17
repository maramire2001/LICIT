import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

OCDS_BASE = "https://api.datos.gob.mx/v2/contratacionesabiertas"

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def fetch_licitaciones_page(page: int = 1, page_size: int = 100) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            OCDS_BASE,
            params={"pageSize": page_size, "page": page},
        )
        r.raise_for_status()
        return r.json()

def parse_ocds_release(release: dict) -> dict:
    tender = release.get("tender", {})
    awards = release.get("awards", [])
    award = awards[0] if awards else {}
    buyer = release.get("buyer", {})

    return {
        "numero_procedimiento": release.get("ocid", ""),
        "titulo": tender.get("title", "Sin título"),
        "dependencia": buyer.get("name", ""),
        "fecha_publicacion": tender.get("datePublished"),
        "fecha_apertura": tender.get("tenderPeriod", {}).get("startDate"),
        "fecha_fallo": tender.get("awardPeriod", {}).get("endDate"),
        "monto_estimado": tender.get("value", {}).get("amount"),
        "estado": "activa" if tender.get("status") == "active" else "cerrada",
        "url_fuente": release.get("url", ""),
        "raw_json": release,
        "empresa_ganadora": award.get("suppliers", [{}])[0].get("name") if award else None,
        "monto_adjudicado": award.get("value", {}).get("amount") if award else None,
    }
