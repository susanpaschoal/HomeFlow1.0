"""HomeFlow backend API tests - comprehensive coverage."""
import os
import time
import uuid
import pytest
import requests
from pathlib import Path

# Load frontend .env for EXPO_PUBLIC_BACKEND_URL
_env = Path('/app/frontend/.env').read_text()
BASE_URL = None
for line in _env.splitlines():
    if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
        BASE_URL = line.split('=', 1)[1].strip().strip('"').rstrip('/')
        break
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not set"
API = f"{BASE_URL}/api"

FOUNDER_EMAIL = 'susanrodriguesp@gmail.com'
FOUNDER_PW = 'founder123'
TEST_EMAIL = 'teste@homeflow.app'
TEST_PW = 'senha123'


def _register_or_login(email, password, name='Test'):
    r = requests.post(f"{API}/auth/register", json={'name': name, 'email': email, 'password': password}, timeout=30)
    if r.status_code == 200:
        return r.json()
    r = requests.post(f"{API}/auth/login", json={'email': email, 'password': password}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope='module')
def user_auth():
    data = _register_or_login(TEST_EMAIL, TEST_PW, 'Teste Regular')
    return data


@pytest.fixture(scope='module')
def founder_auth():
    data = _register_or_login(FOUNDER_EMAIL, FOUNDER_PW, 'Susan Founder')
    return data


@pytest.fixture(scope='module')
def h(user_auth):
    return {'Authorization': f"Bearer {user_auth['token']}", 'Content-Type': 'application/json'}


# ---------- Health / Root ----------
def test_root():
    r = requests.get(f"{BASE_URL}/api/", timeout=15)
    # root is at /  not /api/, but /api prefix routing... test /api which may 404. Try both
    r2 = requests.get(f"{BASE_URL}/", timeout=15)
    assert r.status_code in (200, 404) or r2.status_code == 200


# ---------- Auth ----------
def test_register_regular_user(user_auth):
    assert 'token' in user_auth
    u = user_auth['user']
    assert u['email'] == TEST_EMAIL
    assert u['is_founder'] is False
    # Note: teste@homeflow.app was upgraded to Premium via admin in iteration 1


def test_register_founder_flags(founder_auth):
    u = founder_auth['user']
    assert u['email'] == FOUNDER_EMAIL
    assert u['is_founder'] is True, "Founder email should have is_founder=True"
    assert u['is_premium'] is True, "Founder email should have is_premium=True"


def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login", json={'email': TEST_EMAIL, 'password': 'wrong'}, timeout=15)
    assert r.status_code == 401


def test_login_correct(user_auth):
    r = requests.post(f"{API}/auth/login", json={'email': TEST_EMAIL, 'password': TEST_PW}, timeout=15)
    assert r.status_code == 200
    assert 'token' in r.json()


def test_me_endpoint(h):
    r = requests.get(f"{API}/auth/me", headers=h, timeout=15)
    assert r.status_code == 200
    assert r.json()['email'] == TEST_EMAIL


def test_me_no_token():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


def test_me_invalid_token():
    r = requests.get(f"{API}/auth/me", headers={'Authorization': 'Bearer notavalidtoken'}, timeout=15)
    assert r.status_code == 401


# ---------- Wallets & Transactions ----------
def test_wallet_crud_and_transaction_balance_update(h):
    # create wallet
    r = requests.post(f"{API}/wallets", headers=h,
                      json={'name': 'TEST_WALLET', 'type': 'checking', 'balance': 100.0}, timeout=15)
    assert r.status_code == 200
    wallet = r.json()
    wid = wallet['id']
    assert wallet['balance'] == 100.0

    # GET list
    r = requests.get(f"{API}/wallets", headers=h, timeout=15)
    assert r.status_code == 200
    assert any(w['id'] == wid for w in r.json())

    # add income tx -> +50
    r = requests.post(f"{API}/transactions", headers=h,
                      json={'wallet_id': wid, 'type': 'income', 'amount': 50, 'category': 'Salário'}, timeout=15)
    assert r.status_code == 200
    tx_income = r.json()

    # add expense tx -> -30
    r = requests.post(f"{API}/transactions", headers=h,
                      json={'wallet_id': wid, 'type': 'expense', 'amount': 30, 'category': 'Alimentação'}, timeout=15)
    assert r.status_code == 200

    # verify balance = 100 + 50 - 30 = 120
    r = requests.get(f"{API}/wallets", headers=h, timeout=15)
    w = next(w for w in r.json() if w['id'] == wid)
    assert abs(w['balance'] - 120.0) < 0.01, f"expected 120, got {w['balance']}"

    # delete tx -> balance rolls back
    r = requests.delete(f"{API}/transactions/{tx_income['id']}", headers=h, timeout=15)
    assert r.status_code == 200
    r = requests.get(f"{API}/wallets", headers=h, timeout=15)
    w = next(w for w in r.json() if w['id'] == wid)
    assert abs(w['balance'] - 70.0) < 0.01, f"expected 70 after income delete, got {w['balance']}"

    # cleanup
    requests.delete(f"{API}/wallets/{wid}", headers=h, timeout=15)


# ---------- Goals ----------
def test_goals_crud(h):
    r = requests.post(f"{API}/goals", headers=h,
                      json={'name': 'TEST_Goal', 'target': 1000, 'saved': 100}, timeout=15)
    assert r.status_code == 200
    gid = r.json()['id']

    r = requests.patch(f"{API}/goals/{gid}", headers=h,
                       json={'name': 'TEST_Goal_upd', 'target': 2000, 'saved': 500}, timeout=15)
    assert r.status_code == 200
    assert r.json()['target'] == 2000

    r = requests.get(f"{API}/goals", headers=h, timeout=15)
    assert any(g['id'] == gid for g in r.json())

    r = requests.delete(f"{API}/goals/{gid}", headers=h, timeout=15)
    assert r.status_code == 200


# ---------- Tasks ----------
def test_tasks_crud(h):
    r = requests.post(f"{API}/tasks", headers=h,
                      json={'title': 'TEST_Task', 'category': 'Casa', 'priority': 'high'}, timeout=15)
    assert r.status_code == 200
    tid = r.json()['id']

    r = requests.patch(f"{API}/tasks/{tid}", headers=h,
                       json={'title': 'TEST_Task', 'status': 'done', 'priority': 'low'}, timeout=15)
    assert r.status_code == 200
    assert r.json()['status'] == 'done'

    r = requests.delete(f"{API}/tasks/{tid}", headers=h, timeout=15)
    assert r.status_code == 200


# ---------- Shopping ----------
def test_shopping_crud(h):
    r = requests.post(f"{API}/shopping", headers=h,
                      json={'name': 'TEST_Milk', 'category': 'Mercado', 'quantity': 2}, timeout=15)
    assert r.status_code == 200
    sid = r.json()['id']

    r = requests.patch(f"{API}/shopping/{sid}", headers=h,
                       json={'name': 'TEST_Milk', 'category': 'Mercado', 'quantity': 2, 'bought': True}, timeout=15)
    assert r.status_code == 200
    assert r.json()['bought'] is True

    r = requests.delete(f"{API}/shopping/{sid}", headers=h, timeout=15)
    assert r.status_code == 200


# ---------- Events ----------
def test_events_crud(h):
    r = requests.post(f"{API}/events", headers=h,
                      json={'title': 'TEST_Event', 'date': '2026-02-15', 'time': '10:00'}, timeout=15)
    assert r.status_code == 200
    eid = r.json()['id']
    r = requests.get(f"{API}/events", headers=h, timeout=15)
    assert any(e['id'] == eid for e in r.json())
    r = requests.delete(f"{API}/events/{eid}", headers=h, timeout=15)
    assert r.status_code == 200


# ---------- Cards ----------
def test_cards_crud(h):
    r = requests.post(f"{API}/cards", headers=h,
                      json={'name': 'TEST_Nubank', 'limit': 5000, 'closing_day': 10, 'due_day': 17}, timeout=15)
    assert r.status_code == 200
    cid = r.json()['id']
    r = requests.get(f"{API}/cards", headers=h, timeout=15)
    assert any(c['id'] == cid for c in r.json())
    r = requests.delete(f"{API}/cards/{cid}", headers=h, timeout=15)
    assert r.status_code == 200


# ---------- Dashboard ----------
def test_dashboard_summary(h):
    r = requests.get(f"{API}/dashboard/summary", headers=h, timeout=15)
    assert r.status_code == 200
    j = r.json()
    for k in ['total_balance', 'month_income', 'month_expense', 'wallets_count',
              'tasks_pending', 'shopping_pending', 'next_events', 'upcoming_tasks', 'goals']:
        assert k in j, f"missing key {k}"


# ---------- Founders list (now founder-only) ----------
def test_founders_list(founder_auth):
    headers = {'Authorization': f"Bearer {founder_auth['token']}"}
    r = requests.get(f"{API}/founders", headers=headers, timeout=15)
    assert r.status_code == 200
    emails = [d['email'] for d in r.json()]
    assert 'susanrodriguesp@gmail.com' in emails
    assert 'martins.kmsp@gmail.com' in emails


# ---------- AI Chat ----------
def test_ai_chat(h):
    r = requests.post(f"{API}/ai/chat", headers=h,
                      json={'message': 'Diga apenas OK'}, timeout=60)
    assert r.status_code == 200, f"AI failed: {r.text[:300]}"
    j = r.json()
    assert 'reply' in j and len(j['reply']) > 0


# ---------- Auth guard on protected endpoints ----------
@pytest.mark.parametrize('path', ['/wallets', '/transactions', '/goals', '/tasks', '/shopping', '/events', '/cards', '/dashboard/summary'])
def test_protected_endpoints_require_auth(path):
    r = requests.get(f"{API}{path}", timeout=15)
    assert r.status_code == 401, f"{path} should require auth, got {r.status_code}"
