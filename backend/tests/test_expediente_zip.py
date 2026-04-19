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
    assert "AVISO LEGAL" in result
    assert "responsabilidad de la presentación" in result


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
    assert "Licitación:" in result


def test_economica_con_ptw():
    result = _generar_economica(
        {"monto_propuesto": 5_000_000, "desglose": []},
        ptw_conservador=4_500_000,
        ptw_optimo=5_000_000,
        ptw_agresivo=5_500_000,
    )
    assert "5,000,000" in result
    assert "4,500,000" in result
    assert "Price to Win conservador:" in result


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
