"""Phase 4 backend tests: expanded catalog, order tracking, marketing campaigns, Meta notification settings."""
import os
import uuid
import pytest
import requests

def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if not url:
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
        except FileNotFoundError:
            pass
    return url.rstrip("/")

BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@veikals.lv"
ADMIN_PASSWORD = "Admin123!"


# --- Shared fixtures ---

@pytest.fixture(scope="module")
def admin_token():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed {r.status_code} {r.text}"
    return s.cookies.get("access_token")


@pytest.fixture(scope="module")
def customer_session():
    s = requests.Session()
    email = f"TEST_p4_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Test123!", "name": "TEST Phase4"})
    assert r.status_code == 200, r.text
    return {"session": s, "email": email, "token": s.cookies.get("access_token")}


def admin_h(token):
    return {"Authorization": f"Bearer {token}"}


# --- Expanded catalog (18 products) ---

class TestExpandedCatalog:
    def test_18_products_total(self):
        r = requests.get(f"{API}/products")
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 18, f"expected exactly 18 products, got {len(items)}"

    def test_products_have_brand_and_supplier(self):
        r = requests.get(f"{API}/products")
        items = r.json()
        missing_brand = [p["name"] for p in items if not p.get("brand")]
        missing_sup = [p["name"] for p in items if not p.get("supplier_name")]
        assert not missing_brand, f"products missing brand: {missing_brand}"
        assert not missing_sup, f"products missing supplier_name: {missing_sup}"

    def test_new_products_present(self):
        r = requests.get(f"{API}/products")
        names = {p["name"] for p in r.json()}
        for n in ["MacBook Pro 16\" M4 Max", "AirPods Pro 3", "Apple Watch Ultra 3",
                  "Sony WH-1000XM6 Bezvadu Austiņas", "Denim Jaka — Indigo",
                  "Smaržas — Tobacco Vanille", "Ādas Maks — Melns"]:
            assert n in names, f"missing product: {n}"


# --- Order tracking (public) ---

class TestOrderTracking:
    @pytest.fixture(scope="class")
    def created_order(self, customer_session):
        """Create a pending order via checkout flow for tracking tests."""
        s = customer_session["session"]
        # find any product
        r = requests.get(f"{API}/products")
        pid = r.json()[0]["id"]
        # add to cart
        add = s.post(f"{API}/cart/add", json={"product_id": pid, "quantity": 1})
        assert add.status_code == 200
        # checkout - this will hit stripe; that may fail. Try.
        co = s.post(f"{API}/payments/checkout", json={"origin_url": "https://example.com"})
        if co.status_code != 200:
            pytest.skip(f"checkout unavailable ({co.status_code}); cannot create order for tracking")
        # find latest order
        orders = s.get(f"{API}/orders").json()
        assert orders, "no orders after checkout"
        return {"order_id": orders[0]["id"], "email": customer_session["email"]}

    def test_track_missing_email_400(self, created_order):
        r = requests.get(f"{API}/orders/track/{created_order['order_id']}")
        assert r.status_code == 400

    def test_track_empty_email_400(self, created_order):
        r = requests.get(f"{API}/orders/track/{created_order['order_id']}", params={"email": ""})
        assert r.status_code == 400

    def test_track_correct_id_and_email(self, created_order):
        r = requests.get(f"{API}/orders/track/{created_order['order_id']}",
                         params={"email": created_order["email"]})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] == created_order["order_id"]
        assert "timeline" in data and isinstance(data["timeline"], list)
        assert len(data["timeline"]) == 4
        keys = [t["key"] for t in data["timeline"]]
        assert keys == ["pending", "paid", "shipped", "delivered"]
        # sensitive fields excluded
        assert "user_id" not in data
        assert "session_id" not in data

    def test_track_wrong_email_404(self, created_order):
        r = requests.get(f"{API}/orders/track/{created_order['order_id']}",
                         params={"email": "wrong@example.com"})
        assert r.status_code == 404

    def test_track_unknown_id_404(self):
        r = requests.get(f"{API}/orders/track/nonexistent-xyz",
                         params={"email": "any@example.com"})
        assert r.status_code == 404


# --- Marketing channels ---

class TestMarketingChannels:
    def test_channels_admin(self, admin_token):
        r = requests.get(f"{API}/marketing/channels", headers=admin_h(admin_token))
        assert r.status_code == 200
        data = r.json()
        for k in ("telegram", "facebook", "instagram"):
            assert k in data
            assert "configured" in data[k]
            assert isinstance(data[k]["configured"], bool)

    def test_channels_non_admin_403(self, customer_session):
        r = requests.get(f"{API}/marketing/channels",
                         headers={"Authorization": f"Bearer {customer_session['token']}"})
        assert r.status_code == 403

    def test_channels_anonymous_401(self):
        r = requests.get(f"{API}/marketing/channels")
        assert r.status_code == 401


# --- Marketing campaigns ---

class TestMarketingCampaigns:
    @pytest.fixture(scope="class")
    def campaign(self, admin_token):
        payload = {
            "title": "TEST_phase4_campaign",
            "caption": "Hello world TEST",
            "image_url": "https://example.com/img.png",
            "channels": ["telegram", "facebook", "instagram"],
        }
        r = requests.post(f"{API}/marketing/campaigns", json=payload, headers=admin_h(admin_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["id"] and d["channels"] == ["telegram", "facebook", "instagram"]
        assert d["status"] == "draft"
        return d

    def test_create_invalid_channels_filtered(self, admin_token):
        r = requests.post(f"{API}/marketing/campaigns",
                          json={"title": "TEST_filter", "caption": "x",
                                "channels": ["telegram", "twitter", "tiktok"]},
                          headers=admin_h(admin_token))
        assert r.status_code == 200
        assert r.json()["channels"] == ["telegram"]
        # cleanup
        requests.delete(f"{API}/marketing/campaigns/{r.json()['id']}", headers=admin_h(admin_token))

    def test_create_empty_channels_400(self, admin_token):
        r = requests.post(f"{API}/marketing/campaigns",
                          json={"title": "TEST_empty", "caption": "x", "channels": []},
                          headers=admin_h(admin_token))
        assert r.status_code == 400

    def test_create_all_invalid_channels_400(self, admin_token):
        r = requests.post(f"{API}/marketing/campaigns",
                          json={"title": "TEST_all_inv", "caption": "x",
                                "channels": ["xx", "yy"]},
                          headers=admin_h(admin_token))
        assert r.status_code == 400

    def test_list_campaigns_admin(self, admin_token, campaign):
        r = requests.get(f"{API}/marketing/campaigns", headers=admin_h(admin_token))
        assert r.status_code == 200
        ids = [c["id"] for c in r.json()]
        assert campaign["id"] in ids

    def test_list_campaigns_non_admin_403(self, customer_session):
        r = requests.get(f"{API}/marketing/campaigns",
                         headers={"Authorization": f"Bearer {customer_session['token']}"})
        assert r.status_code == 403

    def test_send_campaign_graceful_no_op(self, admin_token, campaign):
        r = requests.post(f"{API}/marketing/campaigns/{campaign['id']}/send",
                          headers=admin_h(admin_token))
        assert r.status_code == 200, r.text
        data = r.json()
        assert "results" in data
        for ch in ["telegram", "facebook", "instagram"]:
            assert ch in data["results"]
            assert data["results"][ch].get("sent") is False
            assert data["results"][ch].get("reason"), f"missing reason for {ch}"
        assert data["any_sent"] is False
        # verify db record updated
        listed = requests.get(f"{API}/marketing/campaigns", headers=admin_h(admin_token)).json()
        c = next(c for c in listed if c["id"] == campaign["id"])
        assert c["status"] == "failed"
        assert c.get("sent_at")
        assert c.get("results")

    def test_send_unknown_campaign_404(self, admin_token):
        r = requests.post(f"{API}/marketing/campaigns/nope-{uuid.uuid4().hex}/send",
                          headers=admin_h(admin_token))
        assert r.status_code == 404

    def test_delete_campaign_admin(self, admin_token, campaign):
        r = requests.delete(f"{API}/marketing/campaigns/{campaign['id']}", headers=admin_h(admin_token))
        assert r.status_code == 200
        # second delete should 404
        r2 = requests.delete(f"{API}/marketing/campaigns/{campaign['id']}", headers=admin_h(admin_token))
        assert r2.status_code == 404


# --- Notification settings: Meta fields ---

class TestNotificationSettingsMeta:
    def test_put_meta_fields(self, admin_token):
        payload = {
            "telegram_channel_id": "@TEST_channel",
            "fb_page_id": "TEST_fb_page_123",
            "fb_page_access_token": "EAAG_TEST_secret_ABCDEFGH",
            "ig_user_id": "TEST_ig_999",
            "ig_access_token": "EAAG_IG_TEST_zzzz1234",
        }
        r = requests.put(f"{API}/notifications/settings", json=payload, headers=admin_h(admin_token))
        assert r.status_code == 200, r.text

    def test_get_returns_meta_fields(self, admin_token):
        r = requests.get(f"{API}/notifications/settings", headers=admin_h(admin_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("telegram_channel_id") == "@TEST_channel"
        assert d.get("fb_page_id") == "TEST_fb_page_123"  # unmasked
        assert d.get("ig_user_id") == "TEST_ig_999"  # unmasked
        # masked tokens
        assert d.get("fb_page_access_token_masked", "").startswith("••••")
        assert d.get("fb_page_access_token_masked", "").endswith("FGH")
        assert d.get("ig_access_token_masked", "").startswith("••••")
        assert d.get("ig_access_token_masked", "").endswith("1234")
        # raw tokens not leaked
        assert "fb_page_access_token" not in d or d.get("fb_page_access_token") in (None, "")
        assert "ig_access_token" not in d or d.get("ig_access_token") in (None, "")

    def test_channels_status_after_setting(self, admin_token):
        # After setting fb/ig creds, channels endpoint should report configured: True
        r = requests.get(f"{API}/marketing/channels", headers=admin_h(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert data["facebook"]["configured"] is True
        assert data["instagram"]["configured"] is True
        # telegram requires bot_token + channel_id; channel set but no bot_token here
        # If bot_token was previously set by phase 3 tests, may be True; tolerate both.

    def test_cleanup_meta_settings(self, admin_token):
        # We can't set empty values via PUT (filtered). This is documented but
        # not blocking. Skip cleanup gracefully.
        pass
