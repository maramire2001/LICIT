"""
Unit tests for _score_licitacion helper.
Run: docker exec licit-ai-backend-1 python -m pytest tests/test_radar.py -v
"""
from unittest.mock import MagicMock
from app.api.licitaciones import _score_licitacion


def make_company(
    prioridades_instituciones=None,
    rango_financiero=None,
    sector="",
):
    c = MagicMock()
    c.prioridades_instituciones = prioridades_instituciones or []
    c.rango_financiero = rango_financiero
    c.sector = sector
    return c


def make_licitacion(
    dependencia="Secretaría de Salud",
    monto_estimado=None,
    titulo="Adquisición de equipos",
):
    l = MagicMock()
    l.dependencia = dependencia
    l.monto_estimado = monto_estimado
    l.titulo = titulo
    return l


# ---------------------------------------------------------------------------
# Score 0 — company has no ADN
# ---------------------------------------------------------------------------

def test_score_zero_no_adn():
    company = make_company()
    lic = make_licitacion()
    assert _score_licitacion(lic, company) == 0


# ---------------------------------------------------------------------------
# Institution match → +1
# ---------------------------------------------------------------------------

def test_institution_match():
    company = make_company(prioridades_instituciones=["Salud"])
    lic = make_licitacion(dependencia="Secretaría de Salud")
    assert _score_licitacion(lic, company) == 1


def test_institution_no_match():
    company = make_company(prioridades_instituciones=["PEMEX"])
    lic = make_licitacion(dependencia="Secretaría de Salud")
    assert _score_licitacion(lic, company) == 0


def test_institution_case_insensitive():
    company = make_company(prioridades_instituciones=["imss"])
    lic = make_licitacion(dependencia="Dirección del IMSS Jalisco")
    assert _score_licitacion(lic, company) == 1


# ---------------------------------------------------------------------------
# Rango financiero match → +1
# ---------------------------------------------------------------------------

def test_rango_match_5m_20m():
    company = make_company(rango_financiero="$5M-$20M")
    lic = make_licitacion(monto_estimado=10_000_000)
    assert _score_licitacion(lic, company) == 1


def test_rango_no_match():
    company = make_company(rango_financiero="$5M-$20M")
    lic = make_licitacion(monto_estimado=1_000_000)
    assert _score_licitacion(lic, company) == 0


def test_rango_100m_plus_match():
    company = make_company(rango_financiero="$100M+")
    lic = make_licitacion(monto_estimado=200_000_000)
    assert _score_licitacion(lic, company) == 1


def test_rango_100m_plus_no_match_below():
    company = make_company(rango_financiero="$100M+")
    lic = make_licitacion(monto_estimado=50_000_000)
    assert _score_licitacion(lic, company) == 0


def test_rango_none_monto():
    company = make_company(rango_financiero="$5M-$20M")
    lic = make_licitacion(monto_estimado=None)
    assert _score_licitacion(lic, company) == 0


# ---------------------------------------------------------------------------
# Sector keyword match → +1
# ---------------------------------------------------------------------------

def test_sector_match():
    company = make_company(sector="tecnología")
    lic = make_licitacion(titulo="Adquisición de equipos de tecnología médica")
    assert _score_licitacion(lic, company) == 1


def test_sector_no_match():
    company = make_company(sector="infraestructura")
    lic = make_licitacion(titulo="Adquisición de medicamentos")
    assert _score_licitacion(lic, company) == 0


def test_sector_case_insensitive():
    company = make_company(sector="SALUD")
    lic = make_licitacion(titulo="Servicios de salud preventiva")
    assert _score_licitacion(lic, company) == 1


# ---------------------------------------------------------------------------
# All criteria match → score 3
# ---------------------------------------------------------------------------

def test_all_criteria_score_3():
    company = make_company(
        prioridades_instituciones=["IMSS"],
        rango_financiero="$20M-$100M",
        sector="tecnología",
    )
    lic = make_licitacion(
        dependencia="IMSS Delegación Norte",
        monto_estimado=50_000_000,
        titulo="Equipos de tecnología para laboratorio",
    )
    assert _score_licitacion(lic, company) == 3
