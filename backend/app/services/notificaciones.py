import asyncio
import logging
import smtplib
from email.message import EmailMessage
from app.core.config import settings

_log = logging.getLogger(__name__)


def _build_email_body(count: int) -> str:
    plural = count != 1
    licitaciones = f"{count} licitaciones nuevas" if plural else "1 licitación nueva"
    return (
        f"Tu radar LICIT-IA encontró {licitaciones} en CompraNet.\n\n"
        "Inicia sesión para ver las oportunidades → https://licit-ia.com/dashboard\n\n"
        "— LICIT-IA"
    )


def _send_sync(count: int) -> None:
    emails = [e.strip() for e in settings.notif_emails.split(",") if e.strip()]
    if not emails:
        return
    plural = count != 1
    licitaciones = f"{count} licitaciones nuevas" if plural else "1 licitación nueva"

    msg = EmailMessage()
    msg["Subject"] = f"LICIT-IA: {licitaciones} en tu radar"
    msg["From"] = settings.smtp_user
    msg["To"] = ", ".join(emails)
    msg.set_content(_build_email_body(count))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as s:
        s.starttls()
        s.login(settings.smtp_user, settings.smtp_pass)
        s.send_message(msg)


async def notificar_nuevas_licitaciones(count: int) -> None:
    """Envía alerta por email. No hace nada si smtp_host o notif_emails no están configurados."""
    if not settings.smtp_host or not settings.notif_emails:
        return
    if count == 0:
        return
    try:
        await asyncio.to_thread(_send_sync, count)
    except Exception as exc:
        _log.warning("Email notification failed: %s", exc)
