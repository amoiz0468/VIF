import asyncio
import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, Set
from uuid import UUID

from sqlalchemy.orm import Session, sessionmaker

from .. import models

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


def _ensure_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


async def process_expired_claim(session_factory: sessionmaker, claim_id: UUID) -> None:
    with session_factory() as db:
        claim = (
            db.query(models.Claim)
            .filter(models.Claim.id == claim_id)
            .with_for_update()
            .first()
        )
        if not claim or claim.status != models.ClaimStatus.PENDING.value:
            return

        pulse = (
            db.query(models.Pulse)
            .filter(models.Pulse.id == claim.pulse_id)
            .with_for_update()
            .first()
        )
        student = (
            db.query(models.User)
            .filter(models.User.id == claim.student_user_id)
            .with_for_update()
            .first()
        )
        if not pulse or not student:
            return

        claim.status = models.ClaimStatus.GHOSTED.value
        claim.ghosted_at = datetime.now(timezone.utc)
        pulse.quantity_remaining = max(0, (pulse.quantity_remaining or 0) + max(1, claim.quantity))
        student.karma_score = max(0, (student.karma_score or 0) - 10)
        db.add_all([claim, pulse, student])
        db.commit()
        log.info("Claim %s ghosted after deadline and karma adjusted", claim_id)


async def _delayed_claim_penalty(session_factory: sessionmaker, claim_id: UUID, claim_deadline: datetime) -> None:
    delay_seconds = max(0.0, (_ensure_aware_utc(claim_deadline) - datetime.now(timezone.utc)).total_seconds())
    try:
        await asyncio.sleep(delay_seconds)
        await process_expired_claim(session_factory, claim_id)
    except asyncio.CancelledError:
        log.info("Cancelled delayed claim penalty for %s", claim_id)
        raise


def schedule_claim_penalty(session_factory: sessionmaker, claim_id: UUID, claim_deadline: datetime) -> asyncio.Task:
    task = asyncio.create_task(_delayed_claim_penalty(session_factory, claim_id, claim_deadline))
    register_claim_task(claim_id, task)
    return task


def bootstrap_pending_claim_tasks(session_factory: sessionmaker) -> None:
    with session_factory() as db:
        pending_claims = (
            db.query(models.Claim)
            .filter(models.Claim.status == models.ClaimStatus.PENDING.value)
            .all()
        )

    for claim in pending_claims:
        deadline = claim.claim_deadline or claim.expires_at
        schedule_claim_penalty(session_factory, claim.id, deadline)


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
