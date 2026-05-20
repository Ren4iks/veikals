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
