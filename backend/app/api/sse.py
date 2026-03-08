"""Server-Sent Events endpoint for real-time contact updates."""
import asyncio
import json
from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse
from app.auth import get_current_user
from app.models.models import User
from app.services import register_queue, unregister_queue

router = APIRouter(prefix="/sse", tags=["sse"])


@router.get("/events")
async def sse_events(user: User = Depends(get_current_user)):
    q = register_queue(user.id)

    async def generator():
        try:
            yield {"event": "connected", "data": json.dumps({"user_id": user.id})}
            while True:
                try:
                    payload = await asyncio.wait_for(q.get(), timeout=25.0)
                    yield {"event": payload["type"], "data": json.dumps(payload["data"])}
                except asyncio.TimeoutError:
                    yield {"event": "ping", "data": "{}"}
        finally:
            unregister_queue(user.id, q)

    return EventSourceResponse(generator())
