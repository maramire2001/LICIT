import anthropic
import json
from app.core.config import settings

_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

DEFAULT_MODEL = "claude-sonnet-4-5"
FAST_MODEL = "claude-haiku-4-5-20251001"

async def chat(
    messages: list[dict],
    model: str = DEFAULT_MODEL,
    response_format: dict | None = None,
    temperature: float = 0.2,
) -> str:
    system_msg = None
    user_messages = []
    for m in messages:
        if m["role"] == "system":
            system_msg = m["content"]
        else:
            user_messages.append(m)

    kwargs: dict = {
        "model": model,
        "max_tokens": 4096,
        "temperature": temperature,
        "messages": user_messages,
    }
    if system_msg:
        kwargs["system"] = system_msg
    if response_format and response_format.get("type") == "json_object":
        kwargs["system"] = (kwargs.get("system", "") + "\nResponde ÚNICAMENTE con JSON válido, sin texto adicional.").strip()

    response = await _client.messages.create(**kwargs)
    return response.content[0].text

async def embed(text: str) -> list[float]:
    # Anthropic no tiene embeddings — usamos un vector vacío como placeholder
    # En producción integrar un servicio de embeddings separado
    return [0.0] * 1536
