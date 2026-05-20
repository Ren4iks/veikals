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


# --- Phase 2: Discount Codes ---

class TestDiscountCodes:
    def test_public_codes_lists_active(self):
        r = requests.get(f"{API}/discount-codes/public")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        codes = [c["code"] for c in items]
        # seeded codes
        for expected in ["VEIKALS10", "IPHONE50", "WELCOME"]:
            assert expected in codes, f"missing seeded code {expected}; got {codes}"
        # public payload limited shape
        for c in items:
            assert "code" in c and "type" in c and "value" in c

    def test_admin_list_codes(self, admin_token):
        r = requests.get(f"{API}/discount-codes", headers=admin_headers(admin_token))
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 3
        codes = [c["code"] for c in items]
        assert "VEIKALS10" in codes
        # admin payload has full fields
        sample = items[0]
        for f in ["id", "code", "type", "value", "active", "min_order", "usage_limit", "used_count"]:
            assert f in sample

    def test_list_codes_forbidden_for_customer(self, customer_token):
        r = requests.get(f"{API}/discount-codes", headers=cust_headers(customer_token))
        assert r.status_code == 403

    def test_create_code_forbidden_for_customer(self, customer_token):
        r = requests.post(f"{API}/discount-codes",
                          json={"code": "TEST_NOAUTH", "type": "percentage", "value": 5},
                          headers=cust_headers(customer_token))
        assert r.status_code == 403

    def test_admin_create_update_delete_code(self, admin_token):
        h = admin_headers(admin_token)
        code = f"TEST_PCT_{uuid.uuid4().hex[:6].upper()}"
        # create percentage
        rc = requests.post(f"{API}/discount-codes",
                           json={"code": code, "type": "percentage", "value": 15,
                                 "min_order": 0, "usage_limit": 0, "description": "TEST pct"},
                           headers=h)
        assert rc.status_code == 200, rc.text
        created = rc.json()
        assert created["code"] == code.upper()
        assert created["type"] == "percentage"
        assert created["value"] == 15
        code_id = created["id"]

        # verify via list
        rl = requests.get(f"{API}/discount-codes", headers=h)
        assert any(c["id"] == code_id for c in rl.json())

        # update
        ru = requests.put(f"{API}/discount-codes/{code_id}",
                         json={"value": 20, "active": False}, headers=h)
        assert ru.status_code == 200
        upd = ru.json()
        assert upd["value"] == 20
        assert upd["active"] is False

        # delete
        rd = requests.delete(f"{API}/discount-codes/{code_id}", headers=h)
        assert rd.status_code == 200
        # verify gone
        rl2 = requests.get(f"{API}/discount-codes", headers=h)
        assert not any(c["id"] == code_id for c in rl2.json())

    def test_create_fixed_code(self, admin_token):
        h = admin_headers(admin_token)
        code = f"TEST_FIX_{uuid.uuid4().hex[:6].upper()}"
        rc = requests.post(f"{API}/discount-codes",
                          json={"code": code, "type": "fixed", "value": 7.50,
                                "min_order": 25, "usage_limit": 10},
                          headers=h)
        assert rc.status_code == 200
        d = rc.json()
        assert d["type"] == "fixed"
        assert d["value"] == 7.50
        # cleanup
        requests.delete(f"{API}/discount-codes/{d['id']}", headers=h)

    def test_create_code_invalid_type(self, admin_token):
        h = admin_headers(admin_token)
        r = requests.post(f"{API}/discount-codes",
                         json={"code": "TEST_BAD", "type": "bogus", "value": 5},
                         headers=h)
        assert r.status_code == 400

    def test_create_duplicate_code(self, admin_token):
        h = admin_headers(admin_token)
        r = requests.post(f"{API}/discount-codes",
                         json={"code": "VEIKALS10", "type": "percentage", "value": 5},
                         headers=h)
        assert r.status_code == 400

    def test_validate_valid_percentage(self):
        r = requests.post(f"{API}/discount/validate",
                         json={"code": "VEIKALS10", "subtotal": 100.0})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["code"] == "VEIKALS10"
        assert d["type"] == "percentage"
        assert d["discount_amount"] == 10.0
        assert d["new_total"] == 90.0

    def test_validate_valid_fixed(self):
        r = requests.post(f"{API}/discount/validate",
                         json={"code": "WELCOME", "subtotal": 50.0})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["discount_amount"] == 5.0
        assert d["new_total"] == 45.0

    def test_validate_case_insensitive(self):
        r = requests.post(f"{API}/discount/validate",
                         json={"code": "veikals10", "subtotal": 50.0})
        assert r.status_code == 200
        assert r.json()["code"] == "VEIKALS10"

    def test_validate_invalid_code(self):
        r = requests.post(f"{API}/discount/validate",
                         json={"code": "DOES_NOT_EXIST_XYZ", "subtotal": 100.0})
        assert r.status_code == 404

    def test_validate_min_order_not_met(self):
        # IPHONE50 requires min_order 500
        r = requests.post(f"{API}/discount/validate",
                         json={"code": "IPHONE50", "subtotal": 100.0})
        assert r.status_code == 400


# --- Phase 2: Order Status Update ---

class TestOrderStatus:
    def test_update_status_requires_admin(self, customer_token):
        r = requests.put(f"{API}/orders/some-id/status",
                        json={"status": "shipped"},
                        headers=cust_headers(customer_token))
        assert r.status_code == 403

    def test_invalid_status(self, admin_token, customer_token):
        # create an order first via checkout
        h_cust = cust_headers(customer_token)
        prods = requests.get(f"{API}/products").json()
        requests.post(f"{API}/cart/add", json={"product_id": prods[0]["id"], "quantity": 1}, headers=h_cust)
        rco = requests.post(f"{API}/payments/checkout",
                           json={"origin_url": "https://example.com"},
                           headers=h_cust)
        assert rco.status_code == 200
        # find latest order
        ro = requests.get(f"{API}/orders", headers=h_cust)
        order_id = ro.json()[0]["id"]

        ru = requests.put(f"{API}/orders/{order_id}/status",
                         json={"status": "invalid_status_xyz"},
                         headers=admin_headers(admin_token))
        assert ru.status_code == 400

    def test_admin_update_status_shipped(self, admin_token, customer_token):
        h_cust = cust_headers(customer_token)
        prods = requests.get(f"{API}/products").json()
        requests.post(f"{API}/cart/add", json={"product_id": prods[0]["id"], "quantity": 1}, headers=h_cust)
        requests.post(f"{API}/payments/checkout",
                     json={"origin_url": "https://example.com"},
                     headers=h_cust)
        ro = requests.get(f"{API}/orders", headers=h_cust)
        order_id = ro.json()[0]["id"]

        ru = requests.put(f"{API}/orders/{order_id}/status",
                        json={"status": "shipped"},
                        headers=admin_headers(admin_token))
        assert ru.status_code == 200, ru.text
        assert ru.json()["status"] == "shipped"

    def test_update_nonexistent_order(self, admin_token):
        r = requests.put(f"{API}/orders/nonexistent-id-xyz/status",
                        json={"status": "shipped"},
                        headers=admin_headers(admin_token))
        assert r.status_code == 404


# --- Phase 2: Supplier / Brand fields on products ---

class TestProductSupplierFields:
    def test_seeded_products_have_supplier_and_brand(self):
        r = requests.get(f"{API}/products")
        assert r.status_code == 200
        items = r.json()
        # at least iPhone seeded item carries brand/supplier
        iphones = [p for p in items if "iPhone 17 Pro Max" in p["name"]]
        assert len(iphones) >= 1
        p = iphones[0]
        assert p.get("brand") == "Apple"
        assert p.get("supplier_name")
        assert p.get("supplier_email")

    def test_admin_create_product_with_supplier(self, admin_token):
        h = admin_headers(admin_token)
        payload = {
            "name": f"TEST_supplier_{uuid.uuid4().hex[:6]}",
            "description": "TEST supplier prod", "price": 12.0,
            "category": "apgerbs", "image_url": "https://example.com/x.jpg",
            "brand": "TEST_BRAND",
            "supplier_name": "TEST Supplier Inc.",
            "supplier_email": "supplier@test.example.com",
        }
        rc = requests.post(f"{API}/products", json=payload, headers=h)
        assert rc.status_code == 200, rc.text
        created = rc.json()
        assert created["brand"] == "TEST_BRAND"
        assert created["supplier_name"] == "TEST Supplier Inc."
        assert created["supplier_email"] == "supplier@test.example.com"
        # cleanup
        requests.delete(f"{API}/products/{created['id']}", headers=h)


# --- Phase 2: Checkout w/ Discount Code ---

class TestCheckoutWithDiscount:
    def test_checkout_applies_discount_code(self, admin_token):
        # use a fresh customer
        s = requests.Session()
        email = f"TEST_disc_{uuid.uuid4().hex[:8]}@example.com"
        s.post(f"{API}/auth/register", json={"email": email, "password": "Pass123!", "name": "Disc"})
        tok = s.cookies.get("access_token")
        h = {"Authorization": f"Bearer {tok}"}

        prods = requests.get(f"{API}/products").json()
        # Add T-shirt (€15) x2 → subtotal 30
        tshirt = next(p for p in prods if "T-krekls" in p["name"])
        requests.post(f"{API}/cart/add", json={"product_id": tshirt["id"], "quantity": 2}, headers=h)

        # capture VEIKALS10 used_count before
        before = requests.get(f"{API}/discount-codes", headers=admin_headers(admin_token)).json()
        v10_before = next(c for c in before if c["code"] == "VEIKALS10")
        used_before = v10_before.get("used_count", 0)

        rco = requests.post(f"{API}/payments/checkout",
                           json={"origin_url": "https://example.com", "discount_code": "VEIKALS10"},
                           headers=h)
        assert rco.status_code == 200, rco.text

        # verify order has subtotal/discount/total computed server-side
        ro = requests.get(f"{API}/orders", headers=h)
        order = ro.json()[0]
        assert order["subtotal"] == 30.0
        assert order["discount_amount"] == 3.0  # 10% of 30
        assert order["total"] == 27.0
        assert order["discount_code"] == "VEIKALS10"

        # verify used_count incremented
        after = requests.get(f"{API}/discount-codes", headers=admin_headers(admin_token)).json()
        v10_after = next(c for c in after if c["code"] == "VEIKALS10")
        assert v10_after["used_count"] == used_before + 1

    def test_checkout_ignores_invalid_min_order(self, admin_token):
        # IPHONE50 requires 500 but subtotal will be 30 → no discount applied (silently)
        s = requests.Session()
        email = f"TEST_disc2_{uuid.uuid4().hex[:8]}@example.com"
        s.post(f"{API}/auth/register", json={"email": email, "password": "Pass123!", "name": "D2"})
        tok = s.cookies.get("access_token")
        h = {"Authorization": f"Bearer {tok}"}
        prods = requests.get(f"{API}/products").json()
        tshirt = next(p for p in prods if "T-krekls" in p["name"])
        requests.post(f"{API}/cart/add", json={"product_id": tshirt["id"], "quantity": 2}, headers=h)
        rco = requests.post(f"{API}/payments/checkout",
                           json={"origin_url": "https://example.com", "discount_code": "IPHONE50"},
                           headers=h)
        assert rco.status_code == 200
        ro = requests.get(f"{API}/orders", headers=h)
        order = ro.json()[0]
        assert order["discount_amount"] == 0.0
        assert order["total"] == 30.0
        assert order.get("discount_code") in [None, ""]


# --- Phase 2: Admin Chat Bot ---

class TestAdminChat:
    def test_admin_chat_forbidden_for_customer(self, customer_token):
        r = requests.post(f"{API}/admin/chat",
                         json={"message": "Sveiki"},
                         headers=cust_headers(customer_token))
        assert r.status_code == 403

    def test_admin_chat_requires_auth(self):
        r = requests.post(f"{API}/admin/chat", json={"message": "Sveiki"})
        assert r.status_code == 401

    def test_admin_chat_with_context(self, admin_token):
        r = requests.post(f"{API}/admin/chat",
                         json={"message": "Cik pasūtījumu gaida nosūtīšanu?"},
                         headers=admin_headers(admin_token),
                         timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "reply" in d and isinstance(d["reply"], str) and len(d["reply"]) > 0
        assert "session_id" in d
        assert "context" in d
        assert "pending_paid_orders" in d["context"]
        assert "active_codes" in d["context"]
        # at least the 3 seeded active codes
        assert d["context"]["active_codes"] >= 3


# --- Chat ---

class TestChat:
    def test_chat_latvian(self):
        r = requests.post(f"{API}/chat", json={"message": "Sveiki"}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "reply" in d and isinstance(d["reply"], str)
        assert len(d["reply"]) > 0
        assert "session_id" in d
