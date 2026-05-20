from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# LLM
from emergentintegrations.llm.chat import LlmChat, UserMessage
# Stripe
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest, CheckoutSessionResponse, CheckoutStatusResponse
)

# ----- DB -----
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("veikals")

app = FastAPI(title="Veikals API")
api = APIRouter(prefix="/api")

# ============ MODELS ============

class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str = "customer"
    created_at: datetime

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str  # apgerbs | elektronika | smarzas
    image_url: str
    images: List[str] = Field(default_factory=list)
    stock: int = 10
    variant: Optional[str] = None  # e.g. "Orange", "Blue"
    featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    image_url: str
    images: List[str] = Field(default_factory=list)
    stock: int = 10
    variant: Optional[str] = None
    featured: bool = False

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    stock: Optional[int] = None
    variant: Optional[str] = None
    featured: Optional[bool] = None

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1

class CartAddRequest(BaseModel):
    product_id: str
    quantity: int = 1

class CartUpdateRequest(BaseModel):
    product_id: str
    quantity: int

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[Dict[str, Any]]
    total: float
    status: str = "pending"  # pending | paid | shipped | cancelled
    payment_status: str = "pending"
    session_id: Optional[str] = None
    shipping_address: Optional[Dict[str, str]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CheckoutRequest(BaseModel):
    origin_url: str
    shipping_address: Optional[Dict[str, str]] = None

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

# ============ HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=7 * 24 * 3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                        samesite="none", max_age=30 * 24 * 3600, path="/")

def serialize_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "role": u.get("role", "customer"),
        "created_at": u["created_at"] if isinstance(u["created_at"], str) else u["created_at"].isoformat(),
    }

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user

# ============ AUTH ROUTES ============

@api.post("/auth/register")
async def register(body: RegisterRequest, response: Response):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "E-pasts jau ir reģistrēts")
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": body.name,
        "password_hash": hash_password(body.password),
        "role": "customer",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    access = create_access_token(user_doc["id"], email, "customer")
    refresh = create_refresh_token(user_doc["id"])
    set_auth_cookies(response, access, refresh)
    return serialize_user(user_doc)

@api.post("/auth/login")
async def login(body: LoginRequest, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Nepareizs e-pasts vai parole")
    access = create_access_token(user["id"], email, user.get("role", "customer"))
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return serialize_user(user)

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)

# ============ PRODUCT ROUTES ============

@api.get("/products")
async def list_products(category: Optional[str] = None, featured: Optional[bool] = None):
    q: dict = {}
    if category:
        q["category"] = category
    if featured is not None:
        q["featured"] = featured
    items = await db.products.find(q, {"_id": 0}).to_list(500)
    return items

@api.get("/products/{product_id}")
async def get_product(product_id: str):
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Produkts nav atrasts")
    return p

@api.post("/products")
async def create_product(body: ProductCreate, user: dict = Depends(require_admin)):
    p = Product(**body.model_dump())
    doc = p.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.products.insert_one(doc)
    return doc

@api.put("/products/{product_id}")
async def update_product(product_id: str, body: ProductUpdate, user: dict = Depends(require_admin)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "Nav datu atjaunināšanai")
    res = await db.products.update_one({"id": product_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Produkts nav atrasts")
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    return p

@api.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(require_admin)):
    res = await db.products.delete_one({"id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Produkts nav atrasts")
    return {"ok": True}

# ============ CART ROUTES ============

@api.get("/cart")
async def get_cart(user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cart:
        cart = {"user_id": user["id"], "items": []}
    # Hydrate with product info
    items = []
    for it in cart.get("items", []):
        p = await db.products.find_one({"id": it["product_id"]}, {"_id": 0})
        if p:
            items.append({"product": p, "quantity": it["quantity"]})
    total = sum(i["product"]["price"] * i["quantity"] for i in items)
    return {"items": items, "total": round(total, 2)}

@api.post("/cart/add")
async def cart_add(body: CartAddRequest, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"id": body.product_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Produkts nav atrasts")
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cart:
        cart = {"user_id": user["id"], "items": []}
    items = cart.get("items", [])
    found = False
    for it in items:
        if it["product_id"] == body.product_id:
            it["quantity"] += body.quantity
            found = True
            break
    if not found:
        items.append({"product_id": body.product_id, "quantity": body.quantity})
    await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": items}}, upsert=True)
    return {"ok": True}

@api.put("/cart/update")
async def cart_update(body: CartUpdateRequest, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    items = cart.get("items", []) if cart else []
    if body.quantity <= 0:
        items = [it for it in items if it["product_id"] != body.product_id]
    else:
        found = False
        for it in items:
            if it["product_id"] == body.product_id:
                it["quantity"] = body.quantity
                found = True
                break
        if not found:
            items.append({"product_id": body.product_id, "quantity": body.quantity})
    await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": items}}, upsert=True)
    return {"ok": True}

@api.delete("/cart/{product_id}")
async def cart_remove(product_id: str, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    items = [it for it in (cart.get("items", []) if cart else []) if it["product_id"] != product_id]
    await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": items}}, upsert=True)
    return {"ok": True}

@api.delete("/cart")
async def cart_clear(user: dict = Depends(get_current_user)):
    await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": []}}, upsert=True)
    return {"ok": True}

# ============ ORDERS ============

@api.get("/orders")
async def list_orders(user: dict = Depends(get_current_user)):
    if user.get("role") == "admin":
        orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    else:
        orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders

# ============ PAYMENTS (Stripe) ============

@api.post("/payments/checkout")
async def create_checkout(body: CheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cart or not cart.get("items"):
        raise HTTPException(400, "Grozs ir tukšs")

    # Compute total server-side
    items_for_order = []
    total = 0.0
    for it in cart["items"]:
        p = await db.products.find_one({"id": it["product_id"]}, {"_id": 0})
        if not p:
            continue
        line_total = float(p["price"]) * int(it["quantity"])
        total += line_total
        items_for_order.append({
            "product_id": p["id"],
            "name": p["name"],
            "price": float(p["price"]),
            "quantity": int(it["quantity"]),
            "image_url": p["image_url"],
        })
    if total <= 0:
        raise HTTPException(400, "Nederīga summa")
    total = round(total, 2)

    api_key = os.environ['STRIPE_API_KEY']
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/cart"

    order_id = str(uuid.uuid4())
    metadata = {"user_id": user["id"], "user_email": user["email"], "order_id": order_id}

    checkout_request = CheckoutSessionRequest(
        amount=float(total),
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    try:
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    except Exception as e:
        logger.exception("Stripe checkout creation failed")
        raise HTTPException(500, f"Maksājuma izveide neizdevās: {e}")

    # Create order (pending)
    order_doc = {
        "id": order_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "items": items_for_order,
        "total": total,
        "currency": "eur",
        "status": "pending",
        "payment_status": "initiated",
        "session_id": session.session_id,
        "shipping_address": body.shipping_address or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order_doc)

    # Payment transactions collection
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "order_id": order_id,
        "user_id": user["id"],
        "amount": total,
        "currency": "eur",
        "metadata": metadata,
        "payment_status": "initiated",
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": session.url, "session_id": session.session_id}

@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request):
    api_key = os.environ['STRIPE_API_KEY']
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    try:
        s: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        raise HTTPException(500, f"Maksājuma statusa pārbaude neizdevās: {e}")

    # Update transaction if not already paid
    existing = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if existing and existing.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": s.payment_status, "status": s.status}}
        )
        if s.payment_status == "paid":
            await db.orders.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "status": "paid"}}
            )
            # Clear cart
            user_id = existing.get("user_id")
            if user_id:
                await db.carts.update_one({"user_id": user_id}, {"$set": {"items": []}}, upsert=True)

    return {
        "status": s.status,
        "payment_status": s.payment_status,
        "amount_total": s.amount_total,
        "currency": s.currency,
    }

@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    api_key = os.environ['STRIPE_API_KEY']
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        evt = await stripe_checkout.handle_webhook(body, sig)
    except Exception as e:
        logger.exception("Webhook handle failed")
        raise HTTPException(400, str(e))
    if evt.payment_status == "paid":
        await db.orders.update_one(
            {"session_id": evt.session_id},
            {"$set": {"payment_status": "paid", "status": "paid"}}
        )
        await db.payment_transactions.update_one(
            {"session_id": evt.session_id},
            {"$set": {"payment_status": "paid", "status": "complete"}}
        )
    return {"received": True}

# ============ CHATBOT (GPT-5.2) ============

CHATBOT_SYSTEM = (
    "Tu esi 'Veikals' interneta veikala palīgs. Tu palīdzi klientiem latviešu valodā. "
    "Veikals pārdod: 1) apģērbu (T-krekli 15€, hoodie 30€), "
    "2) iPhone 17 Pro Max 1TB (oranžs un zils, 950€, jauns), "
    "3) luksusa smaržas. "
    "Pieņemam maksājumus ar karti (Apple Pay, Google Pay), PayPal un bankas pārskaitījumu. "
    "Esi īss, draudzīgs un palīdzošs. Atbildes 1-3 teikumos."
)

@api.post("/chat")
async def chat(body: ChatRequest):
    api_key = os.environ['EMERGENT_LLM_KEY']
    session_id = body.session_id or str(uuid.uuid4())
    try:
        chat_obj = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=CHATBOT_SYSTEM,
        ).with_model("openai", "gpt-5.2")
        msg = UserMessage(text=body.message)
        reply = await chat_obj.send_message(msg)
    except Exception as e:
        logger.exception("Chat failed")
        raise HTTPException(500, f"Čats neizdevās: {e}")

    # Persist messages
    await db.chat_messages.insert_many([
        {"id": str(uuid.uuid4()), "session_id": session_id, "role": "user",
         "text": body.message, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "session_id": session_id, "role": "assistant",
         "text": str(reply), "created_at": datetime.now(timezone.utc).isoformat()},
    ])
    return {"reply": str(reply), "session_id": session_id}

# ============ STARTUP: seed admin & products ============

SEED_PRODUCTS = [
    {
        "name": "iPhone 17 Pro Max 1TB — Oranžs",
        "description": "Pilnīgi jauns iPhone 17 Pro Max ar 1TB atmiņu metāliski oranžā krāsā. Pro kameras sistēma, A19 Pro čips, ProMotion displejs.",
        "price": 950.00,
        "category": "elektronika",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/a74d4ba8-ecab-48b2-9ede-e8e8a4e9204f/images/cfab1305e39fbd5f94522fe452ea5359b6bf07da8a93b018636a484544e4602e.png",
        "images": [],
        "stock": 8,
        "variant": "Orange",
        "featured": True,
    },
    {
        "name": "iPhone 17 Pro Max 1TB — Zils",
        "description": "Pilnīgi jauns iPhone 17 Pro Max ar 1TB atmiņu metāliski zilā krāsā. Pro kameras sistēma, A19 Pro čips, ProMotion displejs.",
        "price": 950.00,
        "category": "elektronika",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/a74d4ba8-ecab-48b2-9ede-e8e8a4e9204f/images/7fb36e33cec6a2ffc74fba30aaf36d46519e620c754366a6c1f6caec94627b86.png",
        "images": [],
        "stock": 8,
        "variant": "Blue",
        "featured": True,
    },
    {
        "name": "Klasiskais T-krekls — Melns",
        "description": "Premium kokvilnas T-krekls. Mīksts, izturīgs, minimālistisks dizains.",
        "price": 15.00,
        "category": "apgerbs",
        "image_url": "https://images.pexels.com/photos/8217544/pexels-photo-8217544.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "stock": 50,
        "variant": "Black",
        "featured": False,
    },
    {
        "name": "Hoodie — Black Essential",
        "description": "Minimālistiskais melnais hoodie ar mīkstu iekšpuses oderi. Universāls stilam.",
        "price": 30.00,
        "category": "apgerbs",
        "image_url": "https://images.unsplash.com/photo-1590759483822-b2fee5aa6bd3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwyfHxtaW5pbWFsaXN0JTIwYmxhbmslMjBob29kaWUlMjBtb2RlbHxlbnwwfHx8fDE3NzkzMDgxMTN8MA&ixlib=rb-4.1.0&q=85",
        "stock": 25,
        "variant": "Black",
        "featured": True,
    },
    {
        "name": "Smaržas — Aurum Gold",
        "description": "Luksusa unisex smaržas ar siltām, zelta notīm. 100 ml. Ilgi noturīgs aromāts.",
        "price": 85.00,
        "category": "smarzas",
        "image_url": "https://images.unsplash.com/photo-1770301410072-f6ef6dad65b2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxwcmVtaXVtJTIwcGVyZnVtZSUyMGJvdHRsZXxlbnwwfHx8fDE3NzkzMDgxMTN8MA&ixlib=rb-4.1.0&q=85",
        "stock": 15,
        "variant": None,
        "featured": True,
    },
    {
        "name": "Smaržas — Noir Wood",
        "description": "Vīriešu luksusa smaržas ar koka un tabakas notīm. 100 ml. Elegants un izsmalcināts aromāts.",
        "price": 110.00,
        "category": "smarzas",
        "image_url": "https://images.pexels.com/photos/36834156/pexels-photo-36834156.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "stock": 12,
        "variant": None,
        "featured": False,
    },
]

@app.on_event("startup")
async def startup():
    # Index
    await db.users.create_index("email", unique=True)
    await db.products.create_index("id", unique=True)
    await db.orders.create_index("id", unique=True)
    await db.payment_transactions.create_index("session_id", unique=True)

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@veikals.lv").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin seeded")
    else:
        # Keep hash up-to-date with env
        if not verify_password(admin_password, existing["password_hash"]):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}}
            )

    # Seed products if collection empty
    count = await db.products.count_documents({})
    if count == 0:
        for sp in SEED_PRODUCTS:
            p = Product(**sp)
            doc = p.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.products.insert_one(doc)
        logger.info("Seeded %d products", len(SEED_PRODUCTS))

@app.on_event("shutdown")
async def shutdown():
    client.close()

# Register router
app.include_router(api)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        os.environ.get("FRONTEND_URL", "*"),
        "http://localhost:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@api.get("/")
async def root():
    return {"ok": True, "service": "veikals-api"}
