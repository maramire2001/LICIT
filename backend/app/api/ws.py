from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
from app.core.config import settings
import json

router = APIRouter()

@router.websocket("/analisis/{analisis_id}")
async def analisis_ws(websocket: WebSocket, analisis_id: str):
    await websocket.accept()
    r = aioredis.from_url(settings.redis_url)
    pubsub = r.pubsub()
    await pubsub.subscribe(f"analisis:{analisis_id}")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data_str = message["data"].decode() if isinstance(message["data"], bytes) else message["data"]
                await websocket.send_text(data_str)
                data = json.loads(data_str)
                if data.get("progress") == 100:
                    break
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(f"analisis:{analisis_id}")
        await r.aclose()
