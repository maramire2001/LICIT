from openai import AsyncOpenAI
from app.core.config import settings
from typing import Any

_client = AsyncOpenAI(api_key=settings.openai_api_key)

async def chat(
    messages: list[dict],
    model: str = "gpt-4o",
    response_format: dict | None = None,
    temperature: float = 0.2,
) -> str:
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if response_format:
        kwargs["response_format"] = response_format
    response = await _client.chat.completions.create(**kwargs)
    return response.choices[0].message.content

async def embed(text: str) -> list[float]:
    response = await _client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:8000],
    )
    return response.data[0].embedding
