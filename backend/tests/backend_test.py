"""Veikals API backend tests - covers auth, products, cart, orders, payments, chat."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://portal-start-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@veikals.lv"
ADMIN_PASSWORD = "Admin123!"


# --- Helpers / fixtures ---

def _login(session: requests.Session, email: str, password: str):
    r = session.post(f"{API}/auth/login", json={"email": email, "password": password})
    return r


@pytest.fixture(scope="session")
def admin_token():
    s = requests.Session()
    r = _login(s, ADMIN_EMAIL, ADMIN_PASSWORD)
    assert r.status_code == 200, f"admin login failed {r.status_code} {r.text}"
    # Extract bearer-equivalent: re-login but we only have cookies. JWT is in access_token cookie.
    token = s.cookies.get("access_token")
    assert token, "no access_token cookie set"
    return token


@pytest.fixture(scope="session")
def customer_token():
    """Register a fresh test customer and return access_token."""
    s = requests.Session()
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Test123!", "name": "TEST User"})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    token = s.cookies.get("access_token")
    assert token
    return {"token": token, "email": email}


def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def cust_headers(customer_token):
    return {"Authorization": f"Bearer {customer_token['token']}"}


# --- Health ---

class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("ok") is True


# --- Auth ---

class TestAuth:
    def test_register_sets_cookie(self):
        s = requests.Session()
        email = f"TEST_reg_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Pass123!", "name": "Reg"})
        assert r.status_code == 200, r.text
        d = r.json()
        # backend lowercases emails
        assert d["email"] == email.lower()
        assert d["role"] == "customer"
        assert "id" in d
        assert s.cookies.get("access_token"), "access_token cookie missing"
        assert s.cookies.get("refresh_token"), "refresh_token cookie missing"

    def test_register_duplicate_email(self):
        s = requests.Session()
        email = f"TEST_dup_{uuid.uuid4().hex[:8]}@example.com"
        r1 = s.post(f"{API}/auth/register", json={"email": email, "password": "Pass123!", "name": "A"})
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/auth/register", json={"email": email, "password": "Pass123!", "name": "B"})
        assert r2.status_code == 400

    def test_admin_login(self, admin_token):
        # bcrypt hash format check via re-login response
        s = requests.Session()
        r = _login(s, ADMIN_EMAIL, ADMIN_PASSWORD)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert d["role"] == "admin"
        assert s.cookies.get("access_token")

    def test_login_invalid_credentials(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_auth_me_with_bearer(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert d["role"] == "admin"

    def test_auth_me_unauthorized(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout_clears_cookies(self):
        s = requests.Session()
        r = _login(s, ADMIN_EMAIL, ADMIN_PASSWORD)
        assert r.status_code == 200
        assert s.cookies.get("access_token")
        r2 = s.post(f"{API}/auth/logout")
        assert r2.status_code == 200
        # After logout, cookie should be cleared (server sends delete cookie)
        # /auth/me using session (with cleared cookie) should be 401
        r3 = s.get(f"{API}/auth/me")
        assert r3.status_code == 401


# --- Products ---

class TestProducts:
    def test_list_products(self):
        r = requests.get(f"{API}/products")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 6, f"expected >=6 seeded products, got {len(items)}"
        # ensure _id not leaked
        assert "_id" not in items[0]

    def test_filter_category_elektronika(self):
        r = requests.get(f"{API}/products", params={"category": "elektronika"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 2
        assert all(p["category"] == "elektronika" for p in items)
        # iPhone 17 Pro Max present
        names = [p["name"] for p in items]
        assert any("iPhone 17 Pro Max" in n for n in names)

    def test_filter_featured(self):
        r = requests.get(f"{API}/products", params={"featured": "true"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        assert all(p["featured"] is True for p in items)

    def test_get_single_product(self):
        r = requests.get(f"{API}/products")
        pid = r.json()[0]["id"]
        r2 = requests.get(f"{API}/products/{pid}")
        assert r2.status_code == 200
        assert r2.json()["id"] == pid

    def test_get_product_not_found(self):
        r = requests.get(f"{API}/products/nonexistent-id-xyz")
        assert r.status_code == 404

    def test_create_product_non_admin_forbidden(self, customer_token):
        payload = {
            "name": "TEST_unauthorized", "description": "x", "price": 1.0,
            "category": "apgerbs", "image_url": "https://example.com/x.jpg",
        }
        r = requests.post(f"{API}/products", json=payload, headers=cust_headers(customer_token))
        assert r.status_code == 403

    def test_admin_product_crud(self, admin_token):
        h = admin_headers(admin_token)
        payload = {
            "name": "TEST_prod", "description": "TEST desc", "price": 9.99,
            "category": "apgerbs", "image_url": "https://example.com/x.jpg",
            "stock": 5, "featured": False,
        }
        # CREATE
        rc = requests.post(f"{API}/products", json=payload, headers=h)
        assert rc.status_code == 200, rc.text
        created = rc.json()
        assert created["name"] == "TEST_prod"
        pid = created["id"]

        # GET to verify persistence
        rg = requests.get(f"{API}/products/{pid}")
        assert rg.status_code == 200
        assert rg.json()["price"] == 9.99

        # UPDATE
        ru = requests.put(f"{API}/products/{pid}", json={"price": 19.99, "stock": 3}, headers=h)
        assert ru.status_code == 200
        assert ru.json()["price"] == 19.99
        # Verify persisted
        rg2 = requests.get(f"{API}/products/{pid}")
        assert rg2.json()["price"] == 19.99
        assert rg2.json()["stock"] == 3

        # DELETE
        rd = requests.delete(f"{API}/products/{pid}", headers=h)
        assert rd.status_code == 200
        rg3 = requests.get(f"{API}/products/{pid}")
        assert rg3.status_code == 404


# --- Cart ---

class TestCart:
    def test_cart_full_flow(self, customer_token):
        h = cust_headers(customer_token)
        # get a real product
        prods = requests.get(f"{API}/products").json()
        p1 = prods[0]
        p2 = prods[1] if len(prods) > 1 else prods[0]

        # add p1 x2
        r = requests.post(f"{API}/cart/add", json={"product_id": p1["id"], "quantity": 2}, headers=h)
        assert r.status_code == 200
        # add p2 x1
        r = requests.post(f"{API}/cart/add", json={"product_id": p2["id"], "quantity": 1}, headers=h)
        assert r.status_code == 200

        # GET hydrated cart
        rg = requests.get(f"{API}/cart", headers=h)
        assert rg.status_code == 200
        cart = rg.json()
        assert "items" in cart and "total" in cart
        # at least 1 if same product, else 2
        ids = [it["product"]["id"] for it in cart["items"]]
        assert p1["id"] in ids
        # Total > 0
        assert cart["total"] > 0

        # UPDATE quantity
        ru = requests.put(f"{API}/cart/update", json={"product_id": p1["id"], "quantity": 5}, headers=h)
        assert ru.status_code == 200
        rg = requests.get(f"{API}/cart", headers=h)
        p1_item = next(it for it in rg.json()["items"] if it["product"]["id"] == p1["id"])
        assert p1_item["quantity"] == 5

        # Quantity 0 removes
        ru = requests.put(f"{API}/cart/update", json={"product_id": p1["id"], "quantity": 0}, headers=h)
        assert ru.status_code == 200
        rg = requests.get(f"{API}/cart", headers=h)
        ids = [it["product"]["id"] for it in rg.json()["items"]]
        assert p1["id"] not in ids

        # DELETE specific
        if ids:
            rd = requests.delete(f"{API}/cart/{ids[0]}", headers=h)
            assert rd.status_code == 200

    def test_cart_requires_auth(self):
        r = requests.get(f"{API}/cart")
        assert r.status_code == 401

    def test_cart_add_nonexistent_product(self, customer_token):
        h = cust_headers(customer_token)
        r = requests.post(f"{API}/cart/add", json={"product_id": "no-such-id", "quantity": 1}, headers=h)
        assert r.status_code == 404


# --- Orders ---

class TestOrders:
    def test_orders_requires_auth(self):
        r = requests.get(f"{API}/orders")
        assert r.status_code == 401

    def test_customer_orders_empty_or_list(self, customer_token):
        r = requests.get(f"{API}/orders", headers=cust_headers(customer_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_sees_orders(self, admin_token):
        r = requests.get(f"{API}/orders", headers=admin_headers(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# --- Payments ---

class TestPayments:
    def test_checkout_empty_cart(self, customer_token):
        # Fresh customer with empty cart
        s = requests.Session()
        email = f"TEST_pay_{uuid.uuid4().hex[:8]}@example.com"
        s.post(f"{API}/auth/register", json={"email": email, "password": "Pass123!", "name": "Pay"})
        tok = s.cookies.get("access_token")
        r = requests.post(f"{API}/payments/checkout",
                          json={"origin_url": "https://example.com"},
                          headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 400

    def test_checkout_creates_session_and_order(self, customer_token):
        h = cust_headers(customer_token)
        # ensure cart has something
        prods = requests.get(f"{API}/products").json()
        requests.post(f"{API}/cart/add", json={"product_id": prods[0]["id"], "quantity": 1}, headers=h)

        r = requests.post(f"{API}/payments/checkout",
                          json={"origin_url": "https://example.com"},
                          headers=h)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "url" in d and d["url"].startswith("http")
        assert "session_id" in d
        session_id = d["session_id"]

        # verify pending order created
        ro = requests.get(f"{API}/orders", headers=h)
        sessions = [o.get("session_id") for o in ro.json()]
        assert session_id in sessions

        # status check
        rs = requests.get(f"{API}/payments/status/{session_id}")
        assert rs.status_code == 200
        sd = rs.json()
        assert "status" in sd and "payment_status" in sd


# --- Chat ---

class TestChat:
    def test_chat_latvian(self):
        r = requests.post(f"{API}/chat", json={"message": "Sveiki"}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "reply" in d and isinstance(d["reply"], str)
        assert len(d["reply"]) > 0
        assert "session_id" in d
