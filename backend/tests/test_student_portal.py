from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import patch
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app import auth, database, models, schemas  # noqa: E402
from app.routers.student_portal import router as student_portal_router  # noqa: E402
from app.services import karma_engine, student_portal  # noqa: E402


class FakeQuery:
    def __init__(self, *, first_result=None, one_or_none_result=None, all_result=None):
        self.first_result = first_result
        self.one_or_none_result = one_or_none_result
        self.all_result = all_result
        self.with_for_update_called = False
        self.filter_calls = []
        self.join_calls = []
        self.order_by_calls = []

    def join(self, *args, **kwargs):
        self.join_calls.append((args, kwargs))
        return self

    def filter(self, *args, **kwargs):
        self.filter_calls.append((args, kwargs))
        return self

    def order_by(self, *args, **kwargs):
        self.order_by_calls.append((args, kwargs))
        return self

    def with_for_update(self):
        self.with_for_update_called = True
        return self

    def first(self):
        return self.first_result

    def one_or_none(self):
        return self.one_or_none_result

    def all(self):
        return self.all_result or []


class FakeDB:
    def __init__(self, query_map: dict[object, FakeQuery]):
        self.query_map = query_map
        self.added = []
        self.added_all = []
        self.commits = 0
        self.rollbacks = 0
        self.flushes = 0
        self.refreshes = []

    def query(self, *entities):
        if len(entities) == 3 and entities[0] is models.Pulse and entities[1] is models.Shop:
            key = "nearby"
        else:
            key = entities[0]
        if key not in self.query_map:
            raise AssertionError(f"Unexpected query key: {key!r}")
        return self.query_map[key]

    def begin(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def add(self, obj):
        self.added.append(obj)

    def add_all(self, objs):
        self.added_all.extend(objs)

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def flush(self):
        self.flushes += 1

    def refresh(self, obj):
        self.refreshes.append(obj)


class DummyUpload:
    def __init__(self, payload: bytes):
        self._payload = payload

    async def read(self):
        return self._payload


class StudentPortalServiceTests(IsolatedAsyncioTestCase):
    def setUp(self):
        self.student_user = models.User(
            id=uuid4(),
            email="student@example.edu",
            hashed_password="hash",
            role=models.UserRole.STUDENT.value,
            karma_score=50,
            is_verified=False,
            id_verification_status="pending",
        )
        self.verified_student_user = models.User(
            id=self.student_user.id,
            email=self.student_user.email,
            hashed_password=self.student_user.hashed_password,
            role=self.student_user.role,
            karma_score=self.student_user.karma_score,
            is_verified=True,
            id_verification_status=self.student_user.id_verification_status,
        )
        self.shop = models.Shop(
            id=uuid4(),
            owner_user_id=uuid4(),
            name="Boulangerie Demo",
            siret="12345678901234",
            address="1 Rue de Paris",
            inventory_costs={},
        )

    async def test_get_nearby_pulses_hides_fresh_pulses_from_unverified_students(self):
        now = datetime.now(timezone.utc)
        fresh_pulse = models.Pulse(
            id=uuid4(),
            shop_id=self.shop.id,
            type=models.PulseType.DONATION,
            item_name="Baguette",
            description="Fresh batch",
            is_donation=True,
            quantity=3,
            quantity_remaining=3,
            expires_at=now + timedelta(minutes=45),
            created_at=now - timedelta(minutes=2),
        )
        old_pulse = models.Pulse(
            id=uuid4(),
            shop_id=self.shop.id,
            type=models.PulseType.DONATION,
            item_name="Croissant",
            description="Older batch",
            is_donation=True,
            quantity=2,
            quantity_remaining=2,
            expires_at=now + timedelta(minutes=45),
            created_at=now - timedelta(minutes=30),
        )
        db = FakeDB({"nearby": FakeQuery(all_result=[(fresh_pulse, self.shop, 25.0), (old_pulse, self.shop, 75.0)])})

        pulses = await student_portal.get_nearby_pulses(db, self.student_user, 48.8566, 2.3522)
        self.assertEqual([pulse.item_name for pulse in pulses], ["Croissant"])
        self.assertFalse(pulses[0].priority_window_active)

        verified_pulses = await student_portal.get_nearby_pulses(db, self.verified_student_user, 48.8566, 2.3522)
        self.assertEqual([pulse.item_name for pulse in verified_pulses], ["Baguette", "Croissant"])
        self.assertTrue(verified_pulses[0].priority_window_active)

    async def test_create_claim_decrements_quantity_and_schedules_penalty(self):
        now = datetime.now(timezone.utc)
        pulse = models.Pulse(
            id=uuid4(),
            shop_id=self.shop.id,
            type=models.PulseType.DONATION,
            item_name="Brioche",
            description="Reserve me",
            is_donation=True,
            quantity=1,
            quantity_remaining=1,
            expires_at=now + timedelta(hours=1),
            created_at=now - timedelta(minutes=15),
        )
        db = FakeDB(
            {
                models.User: FakeQuery(one_or_none_result=self.student_user),
                models.Pulse: FakeQuery(one_or_none_result=pulse),
                models.Claim: FakeQuery(first_result=None),
            }
        )
        scheduled = {}

        def fake_schedule(session_factory, claim_id, claim_deadline):
            scheduled["session_factory"] = session_factory
            scheduled["claim_id"] = claim_id
            scheduled["claim_deadline"] = claim_deadline
            return SimpleNamespace()

        with patch.object(karma_engine, "schedule_claim_penalty", side_effect=fake_schedule):
            claim = await student_portal.create_claim(db, self.student_user, pulse.id, lambda: db)

        self.assertEqual(pulse.quantity_remaining, 0)
        self.assertEqual(claim.status, models.ClaimStatus.PENDING.value)
        self.assertEqual(claim.qr_token, claim.qr_code_token)
        self.assertIsNotNone(claim.claim_deadline)
        self.assertLess(abs((claim.claim_deadline - now - timedelta(minutes=20)).total_seconds()), 5)
        self.assertEqual(scheduled["claim_id"], claim.id)
        self.assertEqual(scheduled["claim_deadline"], claim.claim_deadline)
        self.assertTrue(db.query(models.User).with_for_update_called)
        self.assertTrue(db.query(models.Pulse).with_for_update_called)
        self.assertTrue(db.query(models.Claim).with_for_update_called)

    async def test_create_claim_blocks_low_karma_account(self):
        self.student_user.karma_score = 29
        pulse = models.Pulse(
            id=uuid4(),
            shop_id=self.shop.id,
            type=models.PulseType.DONATION,
            item_name="Pain au chocolat",
            description=None,
            is_donation=True,
            quantity=1,
            quantity_remaining=1,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            created_at=datetime.now(timezone.utc) - timedelta(minutes=20),
        )
        db = FakeDB(
            {
                models.User: FakeQuery(one_or_none_result=self.student_user),
                models.Pulse: FakeQuery(one_or_none_result=pulse),
                models.Claim: FakeQuery(first_result=None),
            }
        )

        with self.assertRaises(Exception) as ctx:
            await student_portal.create_claim(db, self.student_user, pulse.id, lambda: db)

        self.assertEqual(getattr(ctx.exception, "status_code", None), 403)

    async def test_create_claim_blocks_second_pending_reservation(self):
        pulse = models.Pulse(
            id=uuid4(),
            shop_id=self.shop.id,
            type=models.PulseType.DONATION,
            item_name="Cake",
            description=None,
            is_donation=True,
            quantity=2,
            quantity_remaining=2,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            created_at=datetime.now(timezone.utc) - timedelta(minutes=20),
        )
        db = FakeDB(
            {
                models.User: FakeQuery(one_or_none_result=self.student_user),
                models.Pulse: FakeQuery(one_or_none_result=pulse),
                models.Claim: FakeQuery(first_result=SimpleNamespace(id=uuid4(), status=models.ClaimStatus.PENDING.value)),
            }
        )

        with self.assertRaises(Exception) as ctx:
            await student_portal.create_claim(db, self.student_user, pulse.id, lambda: db)

        self.assertEqual(getattr(ctx.exception, "status_code", None), 400)

    async def test_create_claim_blocks_reclaiming_same_pulse(self):
        """Student cannot claim the same pulse twice if already collected."""
        pulse_id = uuid4()
        pulse = models.Pulse(
            id=pulse_id,
            shop_id=self.shop.id,
            type=models.PulseType.DONATION,
            item_name="Bread",
            description=None,
            is_donation=True,
            quantity=5,
            quantity_remaining=5,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            created_at=datetime.now(timezone.utc) - timedelta(minutes=20),
        )
        # Already collected claim for the same pulse
        collected_claim = models.Claim(
            id=uuid4(),
            shop_id=self.shop.id,
            pulse_id=pulse_id,
            student_user_id=self.student_user.id,
            qr_token=str(uuid4()),
            qr_code_token=str(uuid4()),
            quantity=1,
            status=models.ClaimStatus.COLLECTED.value,
            claimed_at=datetime.now(timezone.utc) - timedelta(minutes=40),
            claim_deadline=datetime.now(timezone.utc) - timedelta(minutes=20),
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=20),
        )
        
        # Custom FakeDB that returns None for first query (no pending claims)
        # and collected_claim for second query (has collected claim)
        class SequentialClaimQuery(FakeQuery):
            def __init__(self):
                super().__init__(first_result=None)
                self.call_count = 0
                self.collected_claim = collected_claim
            
            def filter(self, *args, **kwargs):
                self.filter_calls.append((args, kwargs))
                return self
            
            def first(self):
                self.call_count += 1
                # First call: no pending claims
                # Second call: has collected claim
                if self.call_count == 1:
                    return None
                elif self.call_count == 2:
                    return self.collected_claim
                return None
        
        db = FakeDB(
            {
                models.User: FakeQuery(one_or_none_result=self.student_user),
                models.Pulse: FakeQuery(one_or_none_result=pulse),
                models.Claim: SequentialClaimQuery(),
            }
        )

        with self.assertRaises(Exception) as ctx:
            await student_portal.create_claim(db, self.student_user, pulse_id, lambda: db)

        self.assertEqual(getattr(ctx.exception, "status_code", None), 409)

    async def test_process_expired_claim_ghosts_pending_claim(self):
        claim = models.Claim(
            id=uuid4(),
            shop_id=self.shop.id,
            pulse_id=uuid4(),
            student_user_id=self.student_user.id,
            qr_token=str(uuid4()),
            qr_code_token=str(uuid4()),
            quantity=1,
            status=models.ClaimStatus.PENDING.value,
            claimed_at=datetime.now(timezone.utc) - timedelta(minutes=25),
            claim_deadline=datetime.now(timezone.utc) - timedelta(minutes=5),
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),
        )
        pulse = models.Pulse(
            id=claim.pulse_id,
            shop_id=self.shop.id,
            type=models.PulseType.DONATION,
            item_name="Baguette",
            description=None,
            is_donation=True,
            quantity=1,
            quantity_remaining=0,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
            created_at=datetime.now(timezone.utc) - timedelta(minutes=30),
        )
        db = FakeDB(
            {
                models.Claim: FakeQuery(first_result=claim),
                models.Pulse: FakeQuery(first_result=pulse),
                models.User: FakeQuery(first_result=self.student_user),
            }
        )

        await karma_engine.process_expired_claim(lambda: db, claim.id)

        self.assertEqual(claim.status, models.ClaimStatus.GHOSTED.value)
        self.assertEqual(pulse.quantity_remaining, 1)
        self.assertEqual(self.student_user.karma_score, 40)
        self.assertEqual(db.commits, 1)

    def test_bootstrap_pending_claim_tasks_schedules_existing_claims(self):
        claim = models.Claim(
            id=uuid4(),
            shop_id=self.shop.id,
            pulse_id=uuid4(),
            student_user_id=self.student_user.id,
            qr_token=str(uuid4()),
            qr_code_token=str(uuid4()),
            quantity=1,
            status=models.ClaimStatus.PENDING.value,
            claimed_at=datetime.now(timezone.utc),
            claim_deadline=datetime.now(timezone.utc) + timedelta(minutes=20),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=20),
        )
        db = FakeDB({models.Claim: FakeQuery(all_result=[claim])})
        scheduled = []

        def fake_schedule(session_factory, claim_id, claim_deadline):
            scheduled.append((session_factory, claim_id, claim_deadline))
            return SimpleNamespace()

        with patch.object(karma_engine, "schedule_claim_penalty", side_effect=fake_schedule):
            karma_engine.bootstrap_pending_claim_tasks(lambda: db)

        self.assertEqual(len(scheduled), 1)
        self.assertEqual(scheduled[0][1], claim.id)
        self.assertEqual(scheduled[0][2], claim.claim_deadline)

    async def test_verify_student_id_marks_verified(self):
        db = FakeDB({})
        today = datetime.now(timezone.utc).date()
        start = today - timedelta(days=180)
        end = today + timedelta(days=180)

        async def fake_extract(upload):
            return "Etudiant IZLY OCR blob"

        async def fake_llm_dates(extracted_text):
            return start, end

        with patch.object(student_portal, "_extract_ocr_text", side_effect=fake_extract), patch.object(
            student_portal, "_llm_correct_student_card_dates", side_effect=fake_llm_dates
        ):
            response = await student_portal.verify_student_id(db, self.student_user, DummyUpload(b"fake image bytes"))

        self.assertTrue(response.verified)
        self.assertFalse(response.manual_review)
        self.assertEqual(response.status, "verified")
        self.assertIn("ETUDIANT", response.matched_keywords)
        self.assertTrue(self.student_user.is_verified)
        self.assertEqual(self.student_user.id_verification_status, "verified")
        self.assertIsNotNone(self.student_user.student_card_start_date)
        self.assertIsNotNone(self.student_user.student_card_end_date)

    async def test_verify_student_id_flags_manual_review_without_readable_end_date(self):
        db = FakeDB({})

        async def fake_extract(upload):
            return "no useful text"

        async def fake_llm_dates(extracted_text):
            return None, None

        with patch.object(student_portal, "_extract_ocr_text", side_effect=fake_extract), patch.object(
            student_portal, "_llm_correct_student_card_dates", side_effect=fake_llm_dates
        ):
            response = await student_portal.verify_student_id(db, self.student_user, DummyUpload(b"fake image bytes"))

        self.assertFalse(response.verified)
        self.assertTrue(response.manual_review)
        self.assertEqual(response.status, "manual_review")
        self.assertEqual(response.matched_keywords, [])
        self.assertFalse(self.student_user.is_verified)
        self.assertEqual(self.student_user.id_verification_status, "manual_review")


class StudentPortalRouteTests(TestCase):
    def _make_app(self, db: FakeDB) -> FastAPI:
        app = FastAPI()
        app.include_router(student_portal_router)

        async def override_student():
            return SimpleNamespace(id=uuid4(), role=models.UserRole.STUDENT.value, is_verified=True)

        def override_db():
            yield db

        app.dependency_overrides[auth.check_student_role] = override_student
        app.dependency_overrides[database.get_db] = override_db
        return app

    def test_claim_route_accepts_payload(self):
        fake_db = FakeDB({})
        app = self._make_app(fake_db)

        async def fake_create_claim(db, current_user, pulse_id, session_factory):
            return SimpleNamespace(
                id=uuid4(),
                pulse_id=pulse_id,
                qr_code_token="token-123",
                qr_token="token-123",
                status=models.ClaimStatus.PENDING.value,
                claim_deadline=datetime.now(timezone.utc) + timedelta(minutes=20),
            )

        with patch.object(student_portal, "create_claim", side_effect=fake_create_claim):
            client = TestClient(app)
            response = client.post("/claims/create", json={"pulse_id": str(uuid4())})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["qr_code_token"], "token-123")

    def test_verify_route_rejects_non_image(self):
        fake_db = FakeDB({})
        app = self._make_app(fake_db)
        client = TestClient(app)

        response = client.post(
            "/student/verify-id",
            files={"upload": ("student.txt", b"hello", "text/plain")},
        )

        self.assertEqual(response.status_code, 400)

    def test_nearby_route_wires_response(self):
        fake_db = FakeDB({})
        app = self._make_app(fake_db)
        pulse = schemas.NearbyPulseResponse(
            pulse_id=uuid4(),
            shop_id=uuid4(),
            shop_name="Demo Shop",
            shop_address="1 Rue",
            item_name="Baguette",
            description="",
            quantity_remaining=1,
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
            distance_meters=42.0,
            priority_window_active=False,
        )

        async def fake_get_nearby_pulses(db, current_user, latitude, longitude):
            return [pulse]

        with patch.object(student_portal, "get_nearby_pulses", side_effect=fake_get_nearby_pulses):
            client = TestClient(app)
            response = client.get("/pulses/nearby?lat=48.8&lng=2.3")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["item_name"], "Baguette")
