from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import bcrypt
import jwt
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
from openai import AsyncOpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_DAYS = int(os.environ.get('JWT_EXPIRE_DAYS', '7'))
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
FOUNDER_SETUP_CODE = os.environ.get('FOUNDER_SETUP_CODE', '')

FOUNDER_EMAILS = [
    'susanrodriguesp@gmail.com',
    'martins.kmsp@gmail.com',
]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="HomeFlow API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def utcnow():
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.isoformat()


# ---------- Models ----------
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    founder_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str = "admin"
    is_founder: bool = False
    is_premium: bool = False
    premium: bool = False
    plano: str = "gratuito"
    premium_until: Optional[str] = None
    data_pagamento: Optional[str] = None
    observacoes: Optional[str] = None
    created_at: str


class PremiumUpdate(BaseModel):
    email: EmailStr
    premium: Optional[bool] = None
    plano: Optional[str] = None
    premium_until: Optional[str] = None
    data_pagamento: Optional[str] = None
    observacoes: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class WalletIn(BaseModel):
    name: str
    type: Literal['checking', 'savings', 'cash', 'card', 'pix', 'investment', 'shared']
    balance: float = 0.0
    color: Optional[str] = None
    icon: Optional[str] = None


class Wallet(WalletIn):
    id: str
    user_id: str
    created_at: str


class TransactionIn(BaseModel):
    wallet_id: str
    type: Literal['income', 'expense']
    amount: float
    category: str
    description: Optional[str] = None
    date: Optional[str] = None
    recurring: bool = False
    installments: Optional[int] = None


class Transaction(TransactionIn):
    id: str
    user_id: str
    created_at: str


class CardIn(BaseModel):
    name: str
    brand: Optional[str] = None
    last4: Optional[str] = None
    limit: float
    closing_day: int
    due_day: int
    color: Optional[str] = None


class Card(CardIn):
    id: str
    user_id: str
    used: float = 0.0
    created_at: str


class GoalIn(BaseModel):
    name: str
    target: float
    saved: float = 0.0
    category: Optional[str] = None
    deadline: Optional[str] = None
    icon: Optional[str] = None


class Goal(GoalIn):
    id: str
    user_id: str
    created_at: str


class TaskIn(BaseModel):
    title: str
    category: Optional[str] = 'Casa'
    status: Literal['todo', 'doing', 'done'] = 'todo'
    priority: Literal['low', 'medium', 'high'] = 'medium'
    due_date: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    checklist: Optional[List[dict]] = None


class Task(TaskIn):
    id: str
    user_id: str
    created_at: str


class ShoppingIn(BaseModel):
    name: str
    category: str = 'Mercado'
    quantity: float = 1
    price: Optional[float] = None
    priority: Literal['low', 'medium', 'high'] = 'medium'
    bought: bool = False
    photo: Optional[str] = None


class ShoppingItem(ShoppingIn):
    id: str
    user_id: str
    created_at: str


class EventIn(BaseModel):
    title: str
    date: str
    time: Optional[str] = None
    category: str = 'Evento'
    notes: Optional[str] = None


class Event(EventIn):
    id: str
    user_id: str
    created_at: str


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


# ---------- Auth helpers ----------
def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_pw(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


# ---- Rate limit for login (in-memory per-IP; resets on restart) ----
from collections import defaultdict
from fastapi import Request

_login_attempts: dict = defaultdict(list)  # ip -> [timestamps]
LOGIN_MAX = 20           # attempts
LOGIN_WINDOW_SEC = 300   # 5 minutes


def _rate_check(ip: str):
    now = datetime.now(timezone.utc).timestamp()
    bucket = _login_attempts[ip]
    # prune
    bucket[:] = [t for t in bucket if now - t < LOGIN_WINDOW_SEC]
    if len(bucket) >= LOGIN_MAX:
        raise HTTPException(status_code=429, detail='Muitas tentativas. Tente novamente em alguns minutos.')
    bucket.append(now)


async def current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Missing token')
    token = authorization.split(' ', 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get('sub')
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail='Invalid token')
    user = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user


def user_to_out(u: dict) -> UserOut:
    email = (u.get('email') or '').lower()
    is_founder = email in FOUNDER_EMAILS
    # Premium is TRUE if founder OR if premium flag is set and (no expiry OR expiry in the future)
    premium_flag = bool(u.get('premium', False)) or bool(u.get('is_premium', False))
    now_iso = iso(utcnow())
    until = u.get('premium_until')
    if until and until < now_iso:
        premium_flag = False
    active_premium = is_founder or premium_flag
    return UserOut(
        id=u['id'],
        name=u['name'],
        email=u['email'],
        role=u.get('role', 'admin'),
        is_founder=is_founder,
        is_premium=active_premium,
        premium=active_premium,
        plano='founder' if is_founder else u.get('plano', 'gratuito'),
        premium_until=u.get('premium_until'),
        data_pagamento=u.get('data_pagamento'),
        observacoes=u.get('observacoes'),
        created_at=u.get('created_at', iso(utcnow())),
    )


# Limits for Gratuito plan (Founders/Premium bypass)
FREE_LIMITS = {
    'wallets': 2,
    'goals': 2,
    'ai_messages_per_day': 3,
}


def is_active_premium(u: dict) -> bool:
    email = (u.get('email') or '').lower()
    if email in FOUNDER_EMAILS:
        return True
    if not (u.get('premium') or u.get('is_premium')):
        return False
    until = u.get('premium_until')
    if until and until < iso(utcnow()):
        return False
    return True


async def enforce_free_limit(user: dict, resource: str, current_count_query: dict, collection_name: str):
    if is_active_premium(user):
        return
    limit = FREE_LIMITS.get(resource)
    if not limit:
        return
    count = await db[collection_name].count_documents(current_count_query)
    if count >= limit:
        raise HTTPException(status_code=402, detail=f"Limite do plano Gratuito atingido ({limit} {resource}). Faça upgrade para Premium.")


# ---------- Auth routes ----------
@api.post('/auth/register', response_model=AuthResponse)
async def register(data: UserRegister):
    email = data.email.lower().strip()
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail='A senha deve ter pelo menos 8 caracteres')
    # Founder email registration requires the setup code (prevents impersonation)
    if email in FOUNDER_EMAILS:
        if not FOUNDER_SETUP_CODE or (data.founder_code or '') != FOUNDER_SETUP_CODE:
            raise HTTPException(status_code=403, detail='Este email é reservado. Cadastro requer código Founder.')
    existing = await db.users.find_one({'email': email})
    if existing:
        raise HTTPException(status_code=400, detail='Email já cadastrado')
    user_id = str(uuid.uuid4())
    doc = {
        'id': user_id,
        'name': data.name.strip(),
        'email': email,
        'password': hash_pw(data.password),
        'role': 'admin',
        'premium': email in FOUNDER_EMAILS,
        'is_premium': email in FOUNDER_EMAILS,
        'plano': 'founder' if email in FOUNDER_EMAILS else 'gratuito',
        'premium_until': None,
        'data_pagamento': None,
        'observacoes': None,
        'created_at': iso(utcnow()),
    }
    await db.users.insert_one(doc)
    token = make_token(user_id)
    return AuthResponse(token=token, user=user_to_out(doc))


@api.post('/auth/login', response_model=AuthResponse)
async def login(data: UserLogin, request: Request):
    _rate_check(request.client.host if request.client else 'unknown')
    email = data.email.lower().strip()
    user = await db.users.find_one({'email': email})
    if not user or not verify_pw(data.password, user['password']):
        raise HTTPException(status_code=401, detail='Email ou senha inválidos')
    token = make_token(user['id'])
    return AuthResponse(token=token, user=user_to_out(user))


@api.get('/auth/me', response_model=UserOut)
async def me(user: dict = Depends(current_user)):
    return user_to_out(user)


# ---------- Wallets ----------
@api.get('/wallets', response_model=List[Wallet])
async def list_wallets(user: dict = Depends(current_user)):
    items = await db.wallets.find({'user_id': user['id']}, {'_id': 0}).to_list(500)
    return items


@api.post('/wallets', response_model=Wallet)
async def create_wallet(data: WalletIn, user: dict = Depends(current_user)):
    await enforce_free_limit(user, 'wallets', {'user_id': user['id']}, 'wallets')
    doc = data.dict()
    doc.update({'id': str(uuid.uuid4()), 'user_id': user['id'], 'created_at': iso(utcnow())})
    await db.wallets.insert_one(doc.copy())
    doc.pop('_id', None)
    return doc


@api.delete('/wallets/{wid}')
async def delete_wallet(wid: str, user: dict = Depends(current_user)):
    await db.wallets.delete_one({'id': wid, 'user_id': user['id']})
    return {'ok': True}


# ---------- Transactions ----------
@api.get('/transactions', response_model=List[Transaction])
async def list_tx(user: dict = Depends(current_user)):
    items = await db.transactions.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return items


@api.post('/transactions', response_model=Transaction)
async def create_tx(data: TransactionIn, user: dict = Depends(current_user)):
    doc = data.dict()
    if not doc.get('date'):
        doc['date'] = iso(utcnow())
    doc.update({'id': str(uuid.uuid4()), 'user_id': user['id'], 'created_at': iso(utcnow())})
    await db.transactions.insert_one(doc.copy())
    # update wallet balance
    sign = 1 if data.type == 'income' else -1
    await db.wallets.update_one(
        {'id': data.wallet_id, 'user_id': user['id']},
        {'$inc': {'balance': sign * data.amount}},
    )
    doc.pop('_id', None)
    return doc


@api.delete('/transactions/{tid}')
async def delete_tx(tid: str, user: dict = Depends(current_user)):
    tx = await db.transactions.find_one({'id': tid, 'user_id': user['id']}, {'_id': 0})
    if tx:
        sign = -1 if tx['type'] == 'income' else 1
        await db.wallets.update_one({'id': tx['wallet_id'], 'user_id': user['id']}, {'$inc': {'balance': sign * tx['amount']}})
        await db.transactions.delete_one({'id': tid, 'user_id': user['id']})
    return {'ok': True}


# ---------- Cards ----------
@api.get('/cards', response_model=List[Card])
async def list_cards(user: dict = Depends(current_user)):
    return await db.cards.find({'user_id': user['id']}, {'_id': 0}).to_list(200)


@api.post('/cards', response_model=Card)
async def create_card(data: CardIn, user: dict = Depends(current_user)):
    doc = data.dict()
    doc.update({'id': str(uuid.uuid4()), 'user_id': user['id'], 'used': 0.0, 'created_at': iso(utcnow())})
    await db.cards.insert_one(doc.copy())
    doc.pop('_id', None)
    return doc


@api.delete('/cards/{cid}')
async def delete_card(cid: str, user: dict = Depends(current_user)):
    await db.cards.delete_one({'id': cid, 'user_id': user['id']})
    return {'ok': True}


# ---------- Goals ----------
@api.get('/goals', response_model=List[Goal])
async def list_goals(user: dict = Depends(current_user)):
    return await db.goals.find({'user_id': user['id']}, {'_id': 0}).to_list(200)


@api.post('/goals', response_model=Goal)
async def create_goal(data: GoalIn, user: dict = Depends(current_user)):
    await enforce_free_limit(user, 'goals', {'user_id': user['id']}, 'goals')
    doc = data.dict()
    doc.update({'id': str(uuid.uuid4()), 'user_id': user['id'], 'created_at': iso(utcnow())})
    await db.goals.insert_one(doc.copy())
    doc.pop('_id', None)
    return doc


@api.patch('/goals/{gid}', response_model=Goal)
async def update_goal(gid: str, data: GoalIn, user: dict = Depends(current_user)):
    await db.goals.update_one({'id': gid, 'user_id': user['id']}, {'$set': data.dict()})
    goal = await db.goals.find_one({'id': gid, 'user_id': user['id']}, {'_id': 0})
    if not goal:
        raise HTTPException(404, 'Goal not found')
    return goal


@api.delete('/goals/{gid}')
async def delete_goal(gid: str, user: dict = Depends(current_user)):
    await db.goals.delete_one({'id': gid, 'user_id': user['id']})
    return {'ok': True}


# ---------- Tasks ----------
@api.get('/tasks', response_model=List[Task])
async def list_tasks(user: dict = Depends(current_user)):
    return await db.tasks.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(500)


@api.post('/tasks', response_model=Task)
async def create_task(data: TaskIn, user: dict = Depends(current_user)):
    doc = data.dict()
    doc.update({'id': str(uuid.uuid4()), 'user_id': user['id'], 'created_at': iso(utcnow())})
    await db.tasks.insert_one(doc.copy())
    doc.pop('_id', None)
    return doc


@api.patch('/tasks/{tid}', response_model=Task)
async def update_task(tid: str, data: TaskIn, user: dict = Depends(current_user)):
    await db.tasks.update_one({'id': tid, 'user_id': user['id']}, {'$set': data.dict()})
    t = await db.tasks.find_one({'id': tid, 'user_id': user['id']}, {'_id': 0})
    if not t:
        raise HTTPException(404, 'Task not found')
    return t


@api.delete('/tasks/{tid}')
async def delete_task(tid: str, user: dict = Depends(current_user)):
    await db.tasks.delete_one({'id': tid, 'user_id': user['id']})
    return {'ok': True}


# ---------- Shopping ----------
@api.get('/shopping', response_model=List[ShoppingItem])
async def list_shopping(user: dict = Depends(current_user)):
    return await db.shopping.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(500)


@api.post('/shopping', response_model=ShoppingItem)
async def create_shopping(data: ShoppingIn, user: dict = Depends(current_user)):
    doc = data.dict()
    doc.update({'id': str(uuid.uuid4()), 'user_id': user['id'], 'created_at': iso(utcnow())})
    await db.shopping.insert_one(doc.copy())
    doc.pop('_id', None)
    return doc


@api.patch('/shopping/{sid}', response_model=ShoppingItem)
async def update_shopping(sid: str, data: ShoppingIn, user: dict = Depends(current_user)):
    await db.shopping.update_one({'id': sid, 'user_id': user['id']}, {'$set': data.dict()})
    s = await db.shopping.find_one({'id': sid, 'user_id': user['id']}, {'_id': 0})
    if not s:
        raise HTTPException(404, 'Item not found')
    return s


@api.delete('/shopping/{sid}')
async def delete_shopping(sid: str, user: dict = Depends(current_user)):
    await db.shopping.delete_one({'id': sid, 'user_id': user['id']})
    return {'ok': True}


# ---------- Events ----------
@api.get('/events', response_model=List[Event])
async def list_events(user: dict = Depends(current_user)):
    return await db.events.find({'user_id': user['id']}, {'_id': 0}).sort('date', 1).to_list(500)


@api.post('/events', response_model=Event)
async def create_event(data: EventIn, user: dict = Depends(current_user)):
    doc = data.dict()
    doc.update({'id': str(uuid.uuid4()), 'user_id': user['id'], 'created_at': iso(utcnow())})
    await db.events.insert_one(doc.copy())
    doc.pop('_id', None)
    return doc


@api.delete('/events/{eid}')
async def delete_event(eid: str, user: dict = Depends(current_user)):
    await db.events.delete_one({'id': eid, 'user_id': user['id']})
    return {'ok': True}


# ---------- Dashboard summary ----------
@api.get('/dashboard/summary')
async def dashboard_summary(user: dict = Depends(current_user)):
    wallets = await db.wallets.find({'user_id': user['id']}, {'_id': 0}).to_list(500)
    txs = await db.transactions.find({'user_id': user['id']}, {'_id': 0}).to_list(1000)
    tasks = await db.tasks.find({'user_id': user['id'], 'status': {'$ne': 'done'}}, {'_id': 0}).to_list(200)
    shopping = await db.shopping.find({'user_id': user['id'], 'bought': False}, {'_id': 0}).to_list(200)
    events = await db.events.find({'user_id': user['id']}, {'_id': 0}).sort('date', 1).to_list(20)
    goals = await db.goals.find({'user_id': user['id']}, {'_id': 0}).to_list(50)

    total_balance = sum(w.get('balance', 0) for w in wallets)
    now = utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_income = 0.0
    month_expense = 0.0
    for t in txs:
        try:
            d = datetime.fromisoformat(t['date'].replace('Z', '+00:00'))
            if d.tzinfo is None:
                d = d.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        if d >= month_start:
            if t['type'] == 'income':
                month_income += t['amount']
            else:
                month_expense += t['amount']

    return {
        'total_balance': total_balance,
        'month_income': month_income,
        'month_expense': month_expense,
        'wallets_count': len(wallets),
        'tasks_pending': len(tasks),
        'shopping_pending': len(shopping),
        'next_events': events[:5],
        'upcoming_tasks': tasks[:5],
        'goals': goals[:5],
    }


# ---------- AI Assistant ----------
@api.post('/ai/chat')
async def ai_chat(req: ChatRequest, user: dict = Depends(current_user)):
    # Enforce daily limit for free plan
    if not is_active_premium(user):
        today_start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        used = await db.ai_messages.count_documents({
            'user_id': user['id'],
            'created_at': {'$gte': iso(today_start)},
        })
        if used >= FREE_LIMITS['ai_messages_per_day']:
            raise HTTPException(
                status_code=402,
                detail=f"Limite diário da IA do plano Gratuito atingido ({FREE_LIMITS['ai_messages_per_day']} mensagens/dia). Faça upgrade para Premium.",
            )
    # gather context
    wallets = await db.wallets.find({'user_id': user['id']}, {'_id': 0}).to_list(50)
    txs = await db.transactions.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(50)
    tasks = await db.tasks.find({'user_id': user['id'], 'status': {'$ne': 'done'}}, {'_id': 0}).to_list(50)
    shopping = await db.shopping.find({'user_id': user['id'], 'bought': False}, {'_id': 0}).to_list(50)
    goals = await db.goals.find({'user_id': user['id']}, {'_id': 0}).to_list(20)

    total_balance = sum(w.get('balance', 0) for w in wallets)
    now = utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_income = 0.0
    month_expense = 0.0
    expense_by_cat: dict = {}
    for t in txs:
        try:
            d = datetime.fromisoformat(t['date'].replace('Z', '+00:00'))
            if d.tzinfo is None:
                d = d.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        if d >= month_start:
            if t['type'] == 'income':
                month_income += t['amount']
            else:
                month_expense += t['amount']
                expense_by_cat[t['category']] = expense_by_cat.get(t['category'], 0) + t['amount']

    ctx_lines = [
        f"Usuário: {user['name']}",
        f"Saldo total: R$ {total_balance:.2f}",
        f"Receitas do mês: R$ {month_income:.2f}",
        f"Despesas do mês: R$ {month_expense:.2f}",
        f"Gastos por categoria: {expense_by_cat}",
        f"Tarefas pendentes: {len(tasks)}",
        f"Itens de compra pendentes: {len(shopping)}",
        f"Metas: {[{'nome': g['name'], 'meta': g['target'], 'atual': g['saved']} for g in goals]}",
    ]
    context_str = "\n".join(ctx_lines)

    system_msg = (
        "Você é o Assistente HomeFlow, uma IA financeira e organizacional para casais e famílias. "
        "Responda em Português-BR, seja objetivo, empático e proativo. Use os dados do usuário abaixo para responder. "
        "Se pedirem análise, dê insights claros com números. Se pedirem sugestões, seja prático.\n\n"
        f"DADOS DO USUÁRIO:\n{context_str}"
    )

    session_id = req.session_id or f"user_{user['id']}"
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_msg,
        ).with_model("openai", "gpt-4o-mini")
        response = await chat.send_message(UserMessage(text=req.message))
        reply_text = response if isinstance(response, str) else str(response)
    except Exception as e:
        logger.exception("AI error")
        raise HTTPException(status_code=500, detail=f"Erro na IA: {str(e)}")

    # persist
    await db.ai_messages.insert_one({
        'id': str(uuid.uuid4()),
        'user_id': user['id'],
        'session_id': session_id,
        'user_message': req.message,
        'assistant_reply': reply_text,
        'created_at': iso(utcnow()),
    })

    return {'reply': reply_text, 'session_id': session_id}


@api.get('/ai/history')
async def ai_history(user: dict = Depends(current_user)):
    msgs = await db.ai_messages.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', 1).to_list(200)
    return msgs


# ---------- Subscription / Premium admin ----------
PLANS = {
    'individual_mensal': {'name': 'Individual Mensal', 'price': 19.90, 'days': 30, 'mp_link': 'https://mpago.la/11kaLFt'},
    'individual_anual': {'name': 'Individual Anual', 'price': 199.90, 'days': 365, 'mp_link': 'https://mpago.la/1azKh3g'},
    'casal_mensal': {'name': 'Casal Mensal', 'price': 29.90, 'days': 30, 'mp_link': 'https://mpago.la/1HWw2mE'},
    'casal_anual': {'name': 'Casal Anual', 'price': 299.90, 'days': 365, 'mp_link': 'https://mpago.la/2chT6rL'},
    'familia_mensal': {'name': 'Família Mensal', 'price': 39.90, 'days': 30, 'mp_link': 'https://mpago.la/1nFyCDR'},
    'familia_anual': {'name': 'Família Anual', 'price': 399.90, 'days': 365, 'mp_link': 'https://mpago.la/1H7nfXb'},
}


@api.get('/plans')
async def get_plans():
    return {'plans': PLANS, 'free_limits': FREE_LIMITS}


class SubscribeRequest(BaseModel):
    plan_key: str


@api.post('/subscriptions/request')
async def request_subscription(data: SubscribeRequest, user: dict = Depends(current_user)):
    if data.plan_key not in PLANS:
        raise HTTPException(status_code=400, detail='Plano inválido')
    plan = PLANS[data.plan_key]
    doc = {
        'id': str(uuid.uuid4()),
        'user_id': user['id'],
        'user_email': user['email'],
        'user_name': user.get('name'),
        'plan_key': data.plan_key,
        'plan_name': plan['name'],
        'price': plan['price'],
        'status': 'pending_manual_activation',
        'created_at': iso(utcnow()),
    }
    await db.subscription_requests.insert_one(doc.copy())
    doc.pop('_id', None)
    return {'ok': True, 'mp_link': plan['mp_link'], 'request': doc}


def require_founder(user: dict):
    email = (user.get('email') or '').lower()
    if email not in FOUNDER_EMAILS:
        raise HTTPException(status_code=403, detail='Apenas Founders podem acessar esta rota')


@api.get('/admin/subscription-requests')
async def list_sub_requests(user: dict = Depends(current_user)):
    require_founder(user)
    items = await db.subscription_requests.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)
    return items


@api.post('/admin/premium/update', response_model=UserOut)
async def admin_update_premium(data: PremiumUpdate, user: dict = Depends(current_user)):
    require_founder(user)
    email = data.email.lower().strip()
    if email in FOUNDER_EMAILS:
        raise HTTPException(status_code=400, detail='Contas Founder já são Premium vitalício')
    target = await db.users.find_one({'email': email})
    if not target:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')
    update: dict = {}
    if data.premium is not None:
        update['premium'] = data.premium
        update['is_premium'] = data.premium
    if data.plano is not None:
        update['plano'] = data.plano
    if data.premium_until is not None:
        update['premium_until'] = data.premium_until
    if data.data_pagamento is not None:
        update['data_pagamento'] = data.data_pagamento
    if data.observacoes is not None:
        update['observacoes'] = data.observacoes
    if update:
        await db.users.update_one({'email': email}, {'$set': update})
    fresh = await db.users.find_one({'email': email}, {'_id': 0})
    return user_to_out(fresh)


@api.get('/admin/users')
async def admin_list_users(user: dict = Depends(current_user)):
    require_founder(user)
    users = await db.users.find({}, {'_id': 0, 'password': 0}).sort('created_at', -1).to_list(1000)
    return [user_to_out(u).dict() for u in users]


# ---------- Founders (restricted) ----------
@api.get('/founders')
async def get_founders(user: dict = Depends(current_user)):
    require_founder(user)
    docs = await db.founders.find({}, {'_id': 0}).to_list(50)
    return docs


@api.get('/')
async def root():
    return {'app': 'HomeFlow', 'status': 'ok'}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def seed_founders():
    for email in FOUNDER_EMAILS:
        await db.founders.update_one(
            {'email': email},
            {'$setOnInsert': {
                'id': str(uuid.uuid4()),
                'email': email,
                'granted_at': iso(utcnow()),
            }},
            upsert=True,
        )
    # promote any existing users with founder emails
    await db.users.update_many({'email': {'$in': FOUNDER_EMAILS}}, {'$set': {'is_premium': True}})
    logger.info(f"Seeded founders: {FOUNDER_EMAILS}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
