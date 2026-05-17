import logging
from typing import Iterable, Mapping, Optional

log = logging.getLogger("vif.fcm")


async def send_push_notifications(
    push_tokens: Iterable[str],
    title: str,
    body: str,
    data: Optional[Mapping[str, str]] = None,
) -> dict:
    tokens = [token for token in push_tokens if token]
    log.info(
        "[MOCK FCM] sending notification to %d devices | title=%s | body=%s | data=%s",
        len(tokens),
        title,
        body,
        dict(data or {}),
    )
    return {"success": True, "sent": len(tokens), "title": title}
