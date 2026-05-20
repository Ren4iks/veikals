"""Telegram + Twilio WhatsApp notification helpers.

Graceful: if credentials are missing or invalid, send_* functions return
{"sent": False, "reason": "..."} instead of raising. This lets the e-commerce
flow continue even without configured channels.
"""
import os
import logging
from typing import Optional

logger = logging.getLogger("veikals.notifications")


async def _get_settings(db) -> dict:
    """Merge .env defaults with admin-configured overrides from DB."""
    doc = await db.notification_settings.find_one({"id": "global"}, {"_id": 0}) or {}
    return {
        "telegram_bot_token": doc.get("telegram_bot_token") or os.environ.get("TELEGRAM_BOT_TOKEN", ""),
        "telegram_chat_id": doc.get("telegram_chat_id") or os.environ.get("TELEGRAM_CHAT_ID", ""),
        "twilio_account_sid": doc.get("twilio_account_sid") or os.environ.get("TWILIO_ACCOUNT_SID", ""),
        "twilio_auth_token": doc.get("twilio_auth_token") or os.environ.get("TWILIO_AUTH_TOKEN", ""),
        "twilio_whatsapp_from": doc.get("twilio_whatsapp_from") or os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886"),
        "whatsapp_to_default": doc.get("whatsapp_to_default") or os.environ.get("WHATSAPP_TO_DEFAULT", ""),
        "enabled_telegram": doc.get("enabled_telegram", True),
        "enabled_whatsapp": doc.get("enabled_whatsapp", True),
    }


async def channel_status(db) -> dict:
    s = await _get_settings(db)
    return {
        "telegram": {
            "configured": bool(s["telegram_bot_token"] and s["telegram_chat_id"]),
            "enabled": s["enabled_telegram"],
            "chat_id_set": bool(s["telegram_chat_id"]),
            "token_set": bool(s["telegram_bot_token"]),
        },
        "whatsapp": {
            "configured": bool(s["twilio_account_sid"] and s["twilio_auth_token"] and s["whatsapp_to_default"]),
            "enabled": s["enabled_whatsapp"],
            "from": s["twilio_whatsapp_from"],
            "to_default": s["whatsapp_to_default"],
            "sid_set": bool(s["twilio_account_sid"]),
            "token_set": bool(s["twilio_auth_token"]),
        },
    }


async def send_telegram(db, message: str, chat_id: Optional[str] = None) -> dict:
    s = await _get_settings(db)
    if not s["enabled_telegram"]:
        return {"sent": False, "reason": "Telegram channel disabled"}
    token = s["telegram_bot_token"]
    target = chat_id or s["telegram_chat_id"]
    if not token or not target:
        return {"sent": False, "reason": "Telegram bot token vai chat_id nav iestatīts"}
    try:
        import httpx
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(url, json={
                "chat_id": target,
                "text": message,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            })
        if r.status_code == 200:
            data = r.json()
            return {"sent": True, "message_id": data.get("result", {}).get("message_id")}
        return {"sent": False, "reason": f"Telegram API: {r.status_code} {r.text[:200]}"}
    except Exception as e:
        logger.exception("telegram send failed")
        return {"sent": False, "reason": str(e)[:200]}


async def send_whatsapp(db, message: str, to: Optional[str] = None) -> dict:
    s = await _get_settings(db)
    if not s["enabled_whatsapp"]:
        return {"sent": False, "reason": "WhatsApp channel disabled"}
    sid = s["twilio_account_sid"]
    token = s["twilio_auth_token"]
    from_num = s["twilio_whatsapp_from"]
    target = to or s["whatsapp_to_default"]
    if not sid or not token:
        return {"sent": False, "reason": "Twilio Account SID vai Auth Token nav iestatīts"}
    if not target:
        return {"sent": False, "reason": "Saņēmēja WhatsApp numurs nav iestatīts"}
    # Ensure 'whatsapp:' prefix
    if not target.startswith("whatsapp:"):
        target = "whatsapp:" + target
    if not from_num.startswith("whatsapp:"):
        from_num = "whatsapp:" + from_num
    try:
        from twilio.rest import Client
        client = Client(sid, token)
        # Twilio's Python SDK is sync — call in threadpool to avoid blocking
        import asyncio
        loop = asyncio.get_event_loop()
        msg = await loop.run_in_executor(
            None,
            lambda: client.messages.create(from_=from_num, to=target, body=message)
        )
        return {"sent": True, "sid": msg.sid, "to": target}
    except Exception as e:
        logger.exception("whatsapp send failed")
        return {"sent": False, "reason": str(e)[:300]}


def format_order_message(order: dict, lines: list, supplier_name: str) -> str:
    """Format a supplier-friendly order message (HTML for Telegram, plain for WhatsApp).
    Telegram supports a subset of HTML tags; WhatsApp ignores them but stays readable.
    """
    addr = order.get("shipping_address") or {}
    addr_str = ", ".join(filter(None, [
        addr.get("name"), addr.get("address"), addr.get("city"),
        addr.get("postal_code"), addr.get("country")
    ])) or "(nav norādīta)"
    items_text = "\n".join([f"  • {it['product']} ×{it['quantity']}" for it in lines])
    return (
        f"<b>🛒 Jauns pasūtījums #{order.get('id','')[:8]}</b>\n"
        f"<b>Piegādātājs:</b> {supplier_name}\n"
        f"<b>Klients:</b> {order.get('user_email','—')}\n"
        f"<b>Summa:</b> €{order.get('total',0):.2f}\n\n"
        f"<b>Prece(s):</b>\n{items_text}\n\n"
        f"<b>Piegādes adrese:</b> {addr_str}\n"
        f"<i>Sūtīts no Veikals automātiskās sistēmas</i>"
    )
