# Veikals — Latvian E-commerce Store

## Original Problem Statement
User uploaded a basic store HTML/CSS/JS and asked for "Build a landing page" → clarified to a full functioning online store with clothing, iPhone 17 Pro Max 1TB (orange/blue, €950, new), perfumes, shopping cart, real card payments (Apple Pay, Google Pay, PayPal, bank transfer), chatbot, admin panel.

## Tech & Architecture
- Backend: FastAPI + MongoDB (motor)
- Frontend: React + Tailwind + Shadcn UI + Phosphor icons
- Auth: JWT in httpOnly cookies (samesite=none) + Bearer header fallback
- Payments: Stripe Checkout (sk_test_emergent) via emergentintegrations
- Chatbot: GPT-5.2 via EMERGENT_LLM_KEY (emergentintegrations)
- Language: Latvian (primary UI)

## Personas
- Customer: Latvian-speaking shopper buying apparel / iPhones / perfumes
- Admin: shop owner managing products

## Implemented (2026-05-20)
- ✅ JWT email/password auth (register, login, logout, /me)
- ✅ Admin seeded (admin@veikals.lv / Admin123!) + product seed (6 products)
- ✅ Product CRUD (admin only for write)
- ✅ Cart (add, update, remove, clear) - server-side
- ✅ Stripe Checkout flow + order + payment_transactions tracking
- ✅ Payment status polling on success page
- ✅ Stripe webhook /api/webhook/stripe
- ✅ GPT-5.2 chatbot widget (Latvian)
- ✅ Admin panel UI for product CRUD
- ✅ Profile + order history
- ✅ Swiss/high-contrast light theme (Space Grotesk display + Inter body)
- ✅ Bento category grid, featured products, marquee

## Test Credentials
See /app/memory/test_credentials.md

## Backlog / Next P1
- Stripe Payment Element with explicit Apple Pay / Google Pay buttons
- PayPal & manual bank transfer flows
- Product image gallery (multiple images per product)
- Search + sort filters
- Stock decrement on paid order
- Wishlist
- Email order confirmation (Resend / SendGrid)

## P2
- Brute-force lockout on /auth/login
- Split server.py into routers
- Product reviews & ratings
- Discount codes

## Phase 2 (2026-05-20)
- ✅ Atlaižu kodi (Discount codes): percentage + fixed types, CRUD admin UI, validation endpoint, applied in cart + checkout (server-side discount math)
- ✅ Seeded codes: VEIKALS10 (-10%), IPHONE50 (-€50, min €500), WELCOME (-€5, min €20)
- ✅ Promo baneris sākumlapā (PromoBanner.jsx) — kods kopēšanai uz clipboard
- ✅ Piegādātāji/Ražotāji (suppliers/brand) per produkts — admin UI lauki, parādīti produktu lapā un admin tabulā
- ✅ Automātiska piegādātāja paziņošana (MOCKED — logged + persisted to db.supplier_notifications, no real email yet) pēc apmaksas
- ✅ Admin AI Bots (GPT-5.2) ar reālā laika kontekstu (apmaksāto pasūtījumu skaits, aktīvie kodi, jaunākie pasūtījumi) — atsevišķs /api/admin/chat endpoint
- ✅ Admin Vadības Panelis ar 4 cilnēm: Produkti / Atlaides / Pasūtījumi / AI Bots
- ✅ Pasūtījumu statusa pārvaldība: pending → paid → shipped → delivered / cancelled

## Backend Tests: 48/48 passing (Phase 1 + Phase 2)

## P1 Backlog
- Reālā e-pasta integrācija (Resend/SendGrid) supplier_notifications vietā mock
- Reālā Stripe atslēga + Apple Pay/Google Pay/PayPal aktivizēšana panelī
- Bankas pārskaitījuma rēķins (PDF + IBAN)
- Discount used_count increment pārvietot uz payment_status=paid vietā no checkout init

## Phase 3 (2026-05-20)
- ✅ Telegram bot integrācija (httpx → Bot API sendMessage, HTML format)
- ✅ Twilio WhatsApp integrācija (twilio sync SDK + asyncio.run_in_executor)
- ✅ Graceful no-op kad atslēgas nav iestatītas — visi paziņojumi atgriež `{sent: false, reason: ...}` bez 500 kļūdām
- ✅ Admin UI cilne "Paziņojumi" ar:
  - Statusa pārskatu (TOKENS / CHAT ID / SAŅĒMĒJS / IESLĒGTS badges)
  - Iestatījumu formu (paroles maskētas pēc saglabāšanas, "Show/hide" toggle)
  - Test sūtīšanas pogām (Telegram / WhatsApp / Abi)
  - Paziņojumu žurnālu (jaunākie 100 ar TG/WA statusu badge)
- ✅ Saglabāšana DB (`notification_settings` doc `id="global"`) ar `.env` fallback
- ✅ Iebūvēts automātiskā piegādātāja paziņošana: pēc `payment_status=paid` tiek nosūtīts Telegram + WhatsApp (sagrupēts pa piegādātāju), log saglabāts `supplier_notifications`
- ✅ Default WhatsApp saņēmējs: `whatsapp:+37125522773` (no lietotāja)
- ✅ Bug fix: novērsts duplicated `_notify_suppliers_for_order` loops (sūtīja 2× ziņas)

## Backend Tests: 62/62 PASSED

## How user adds real credentials later:
1. Atveriet Admin → Paziņojumi
2. Telegram: izveidojiet botu pie @BotFather, ielīmējiet token + chat_id
3. WhatsApp: pierakstieties twilio.com, no Console paņemiet SID + Auth Token; sandbox-ā saņēmējam jānosūta "join <code>" uz +14155238886
4. Saglabāt — pēc tam katrs apmaksāts pasūtījums automātiski sūta paziņojumus
