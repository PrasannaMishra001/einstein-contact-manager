"""Services package — also holds the SSE event broadcast queue."""
import asyncio
from collections import defaultdict
from typing import Dict, List

# user_id → list of asyncio.Queue
_sse_queues: Dict[str, List[asyncio.Queue]] = defaultdict(list)


def register_queue(user_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=100)
    _sse_queues[user_id].append(q)
    return q


def unregister_queue(user_id: str, q: asyncio.Queue):
    if q in _sse_queues[user_id]:
        _sse_queues[user_id].remove(q)


async def broadcast_event(user_id: str, event_type: str, data: dict):
    payload = {"type": event_type, "data": data}
    for q in list(_sse_queues.get(user_id, [])):
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            pass
