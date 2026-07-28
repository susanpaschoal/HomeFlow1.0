"""HomeFlow security-fix verification tests (iteration 2).

Covers:
- SEC-001: Founder impersonation blocked (register requires founder_code)
- SEC-001: /api/founders now founder-only
- SEC-002: Old (weak) JWT secret tokens rejected
- SEC-003: New tokens expire in 7 days
- HARDENING: min password 8 chars
- HARDENING: rate limit on /api/auth/login
- REGRESSION: existing users still work, admin endpoints, plan limits
"""
import os
import time
import uuid
import jwt as pyjwt
import pytest
import requests
from datetime import datetime, timezone
from pathlib import Path

_env = Path('/app/frontend/.env').read_text()
BASE_URL = None
for line in _env.splitlines():
    if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
        BASE_URL = line.split('=', 1)[1].strip().strip('"').rstrip('/')
        break
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL missing"
API = f"{BASE_URL}/api"

FOUNDER_EMAIL_SUSAN = 'susanrodriguesp@gmail.com'
FOUNDER_EMAIL_KAUA = 'martins.kmsp@gmail.com'
FOUNDER_PW = 'founder123'
TEST_EMAIL = 'teste@homeflow.app'
TEST_PW = 'senha123'
FOUNDER_CODE = 'HFOUNDER-Suzy-Kaua-2026-9F3T'
OLD_WEAK_SECRET = 'homeflow_super_secret_key_change_in_prod_2026'


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={'email': email, 'password': pw}, timeout=30)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope='module')
def user_token():
    return _login(TEST_EMAIL, TEST_PW)['token']


@pytest.fixture(scope='module')
def founder_token():
    return _login(FOUNDER_EMAIL_SUSAN, FOUNDER_PW)['token']


def hdr(tok):
    return {'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'}


# ---------- SEC-001 Founder impersonation ----------
class TestSEC001FounderImpersonation:
    def test_register_founder_email_without_code_forbidden(self):
        r = requests.post(f"{API}/auth/register", json={
            'name': 'Impostor', 'email': FOUNDER_EMAIL_KAUA, 'password': 'strongpw123'
        }, timeout=15)
        assert r.status_code == 403
        assert 'ounder' in r.json().get('detail', '')

    def test_register_founder_email_with_wrong_code_forbidden(self):
        r = requests.post(f"{API}/auth/register", json={
            'name': 'Impostor', 'email': FOUNDER_EMAIL_KAUA, 'password': 'strongpw123',
            'founder_code': 'WRONG-CODE'
        }, timeout=15)
        assert r.status_code == 403

    def test_founders_without_token_unauthorized(self):
        r = requests.get(f"{API}/founders", timeout=15)
        assert r.status_code == 401

    def test_founders_with_regular_user_forbidden(self, user_token):
        r = requests.get(f"{API}/founders", headers=hdr(user_token), timeout=15)
        assert r.status_code == 403

    def test_founders_with_founder_ok(self, founder_token):
        r = requests.get(f"{API}/founders", headers=hdr(founder_token), timeout=15)
        assert r.status_code == 200
        emails = [d['email'] for d in r.json()]
        assert FOUNDER_EMAIL_SUSAN in emails
        assert FOUNDER_EMAIL_KAUA in emails


# ---------- SEC-002 JWT secret rotated ----------
class TestSEC002JWTSecret:
    def test_old_weak_secret_token_rejected(self):
        payload = {
            'sub': str(uuid.uuid4()),
            'exp': datetime.now(timezone.utc).timestamp() + 3600,
        }
        forged = pyjwt.encode(payload, OLD_WEAK_SECRET, algorithm='HS256')
        r = requests.get(f"{API}/auth/me", headers={'Authorization': f'Bearer {forged}'}, timeout=15)
        assert r.status_code == 401, f"OLD-SECRET token accepted! {r.status_code} {r.text}"

    def test_random_garbage_token_rejected(self):
        r = requests.get(f"{API}/auth/me", headers={'Authorization': 'Bearer abc.def.ghi'}, timeout=15)
        assert r.status_code == 401


# ---------- SEC-003 7-day token expiry ----------
class TestSEC003TokenExpiry:
    def test_token_expires_in_7_days(self, user_token):
        # decode without verifying signature to read exp
        decoded = pyjwt.decode(user_token, options={'verify_signature': False})
        exp = decoded.get('exp')
        iat = decoded.get('iat')
        assert exp is not None
        if iat:
            delta_days = (exp - iat) / 86400
        else:
            delta_days = (exp - datetime.now(timezone.utc).timestamp()) / 86400
        assert 6.5 <= delta_days <= 7.5, f"expected ~7 days, got {delta_days:.2f} days"


# ---------- HARDENING Password length ----------
class TestPasswordHardening:
    def test_short_password_rejected(self):
        r = requests.post(f"{API}/auth/register", json={
            'name': 'ShortPw', 'email': f'shortpw_{uuid.uuid4().hex[:6]}@homeflow.app',
            'password': '1234'
        }, timeout=15)
        assert r.status_code == 400
        assert '8' in r.json().get('detail', '') or 'caracteres' in r.json().get('detail', '').lower()


# ---------- REGRESSION Basic flows ----------
class TestRegression:
    def test_regular_login_still_works(self, user_token):
        r = requests.get(f"{API}/auth/me", headers=hdr(user_token), timeout=15)
        assert r.status_code == 200
        u = r.json()
        assert u['email'] == TEST_EMAIL

    def test_founder_login_flags(self, founder_token):
        r = requests.get(f"{API}/auth/me", headers=hdr(founder_token), timeout=15)
        assert r.status_code == 200
        u = r.json()
        assert u['is_founder'] is True
        assert u['is_premium'] is True

    def test_register_new_regular_user(self):
        email = f'regressiontest_{uuid.uuid4().hex[:8]}@homeflow.app'
        r = requests.post(f"{API}/auth/register", json={
            'name': 'Regression', 'email': email, 'password': 'testpass123'
        }, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j['user']['email'] == email
        assert j['user']['is_founder'] is False
        assert j['user']['is_premium'] is False

    def test_wallets_crud(self, user_token):
        h = hdr(user_token)
        # user is premium via admin (per test_credentials.md), so no 402
        r = requests.post(f"{API}/wallets", headers=h,
                          json={'name': 'TEST_regr_wallet', 'type': 'checking', 'balance': 10}, timeout=15)
        assert r.status_code == 200
        wid = r.json()['id']
        r = requests.get(f"{API}/wallets", headers=h, timeout=15)
        assert any(w['id'] == wid for w in r.json())
        requests.delete(f"{API}/wallets/{wid}", headers=h, timeout=15)

    def test_dashboard_summary(self, user_token):
        r = requests.get(f"{API}/dashboard/summary", headers=hdr(user_token), timeout=15)
        assert r.status_code == 200
        for k in ['total_balance', 'wallets_count', 'tasks_pending']:
            assert k in r.json()

    def test_ai_chat_founder(self, founder_token):
        r = requests.post(f"{API}/ai/chat", headers=hdr(founder_token),
                          json={'message': 'Diga apenas OK'}, timeout=60)
        assert r.status_code == 200
        assert len(r.json().get('reply', '')) > 0

    def test_subscription_request(self, user_token):
        r = requests.post(f"{API}/subscriptions/request", headers=hdr(user_token),
                          json={'plan_key': 'individual_mensal'}, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert 'mp_link' in j or 'link' in j or 'id' in j

    def test_admin_users_founder_only(self, user_token, founder_token):
        r_regular = requests.get(f"{API}/admin/users", headers=hdr(user_token), timeout=15)
        assert r_regular.status_code == 403
        r_f = requests.get(f"{API}/admin/users", headers=hdr(founder_token), timeout=15)
        assert r_f.status_code == 200
        assert isinstance(r_f.json(), list)

    def test_admin_subscription_requests_founder_only(self, user_token, founder_token):
        r1 = requests.get(f"{API}/admin/subscription-requests", headers=hdr(user_token), timeout=15)
        assert r1.status_code == 403
        r2 = requests.get(f"{API}/admin/subscription-requests", headers=hdr(founder_token), timeout=15)
        assert r2.status_code == 200

    def test_admin_premium_update_forbidden_for_regular(self, user_token):
        r = requests.post(f"{API}/admin/premium/update", headers=hdr(user_token),
                          json={'email': TEST_EMAIL, 'premium': True}, timeout=15)
        assert r.status_code == 403

    def test_admin_premium_update_by_founder(self, founder_token):
        # create fresh target
        email = f'premtarget_{uuid.uuid4().hex[:8]}@homeflow.app'
        rr = requests.post(f"{API}/auth/register", json={
            'name': 'PremTarget', 'email': email, 'password': 'testpass123'
        }, timeout=15)
        assert rr.status_code == 200
        r = requests.post(f"{API}/admin/premium/update", headers=hdr(founder_token),
                          json={'email': email, 'premium': True, 'plano': 'casal_mensal',
                                'premium_until': '2027-12-31', 'observacoes': 'TEST_regr'},
                          timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j['is_premium'] is True
        assert j['plano'] == 'casal_mensal'


# ---------- REGRESSION Free plan limits ----------
class TestFreePlanLimits:
    """Uses a freshly-registered free user."""
    @pytest.fixture(scope='class')
    def free_token(self):
        email = f'freeuser_{uuid.uuid4().hex[:8]}@homeflow.app'
        r = requests.post(f"{API}/auth/register", json={
            'name': 'Free', 'email': email, 'password': 'testpass123'
        }, timeout=15)
        assert r.status_code == 200
        return r.json()['token']

    def test_wallet_limit(self, free_token):
        h = hdr(free_token)
        # 2 wallets ok
        for i in range(2):
            r = requests.post(f"{API}/wallets", headers=h,
                              json={'name': f'TEST_w{i}', 'type': 'checking', 'balance': 0}, timeout=15)
            assert r.status_code == 200, f"w{i}: {r.status_code} {r.text}"
        # 3rd should fail with 402
        r = requests.post(f"{API}/wallets", headers=h,
                          json={'name': 'TEST_w3', 'type': 'checking', 'balance': 0}, timeout=15)
        assert r.status_code == 402

    def test_goal_limit(self, free_token):
        h = hdr(free_token)
        for i in range(2):
            r = requests.post(f"{API}/goals", headers=h,
                              json={'name': f'TEST_g{i}', 'target': 100, 'saved': 0}, timeout=15)
            assert r.status_code == 200
        r = requests.post(f"{API}/goals", headers=h,
                          json={'name': 'TEST_g3', 'target': 100, 'saved': 0}, timeout=15)
        assert r.status_code == 402


# ---------- HARDENING Rate limit on login ----------
# Run last so it doesn't affect other login-based fixtures.
class TestZLoginRateLimit:
    """Named with Z so it runs last (pytest orders alphabetically by default within collected order,
    but we also rely on the fact that fixtures already authenticated above."""
    def test_rate_limit_triggers_429(self):
        # Backend allows 20 attempts / 5min per IP (in-memory bucket keyed on request.client.host).
        # Note: behind the K8s ingress there can be multiple proxy IPs so we need enough attempts
        # to fill all per-proxy buckets. Try up to 80.
        s = requests.Session()
        codes = []
        for i in range(80):
            r = s.post(f"{API}/auth/login",
                       json={'email': 'no_such_user@example.com', 'password': 'wrongwrong1'},
                       timeout=10)
            codes.append(r.status_code)
            if r.status_code == 429:
                break
        assert 429 in codes, f"Expected 429 within 80 attempts. Got 401s={codes.count(401)} 429s={codes.count(429)} last={codes[-5:]}"
