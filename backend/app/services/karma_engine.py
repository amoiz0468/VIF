import asyncio
import logging
from collections import defaultdict
from typing import Dict, Set
from uuid import UUID

log = logging.getLogger("vif.karma")

# In-memory registry of pending background tasks per claim.
_pending_tasks: Dict[UUID, Set[asyncio.Task]] = defaultdict(set)


def register_claim_task(claim_id: UUID, task: asyncio.Task) -> None:
    _pending_tasks[claim_id].add(task)

    def _cleanup(completed_task: asyncio.Task) -> None:
        tasks = _pending_tasks.get(claim_id)
        if not tasks:
            return
        tasks.discard(completed_task)
        if not tasks:
            _pending_tasks.pop(claim_id, None)

    task.add_done_callback(_cleanup)


async def cancel_claim_tasks(claim_id: UUID) -> int:
    tasks = list(_pending_tasks.get(claim_id, set()))
    cancelled = 0
    for task in tasks:
        if not task.done():
            task.cancel()
            cancelled += 1
    _pending_tasks.pop(claim_id, None)
    log.info("Cancelled %d karma tasks for claim %s", cancelled, claim_id)
    return cancelled
