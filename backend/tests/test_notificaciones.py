from app.services.notificaciones import _build_email_body


def test_email_body_singular():
    body = _build_email_body(1)
    assert "1 licitación nueva" in body
    assert "dashboard" in body.lower()


def test_email_body_plural():
    body = _build_email_body(3)
    assert "3 licitaciones nuevas" in body


def test_email_body_zero():
    body = _build_email_body(0)
    assert "0" in body
