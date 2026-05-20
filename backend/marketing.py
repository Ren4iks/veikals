"""Marketing helpers: post to Telegram (channel/chat), Facebook Page, Instagram Business.
All channels gracefully no-op when credentials are missing.
"""
import os
import asyncio
import logging
from typing import Optional

import httpx

logger = logging.getLogger("veikals.marketing")

GRAPH_API_BASE = "https://graph.facebook.com/v22.0"


async def _meta_settings(db) -> dict:
    doc = await db.notification_settings.find_one({"id": "global"}, {"_id": 0}) or {}
    return {
        "fb_page_id": doc.get("fb_page_id") or os.environ.get("FB_PAGE_ID", ""),
        "fb_page_access_token": doc.get("fb_page_access_token") or os.environ.get("FB_PAGE_ACCESS_TOKEN", ""),
        "ig_user_id": doc.get("ig_user_id") or os.environ.get("IG_USER_ID", ""),
        "ig_access_token": doc.get("ig_access_token") or os.environ.get("IG_ACCESS_TOKEN", ""),
        "telegram_bot_token": doc.get("telegram_bot_token") or os.environ.get("TELEGRAM_BOT_TOKEN", ""),
        "telegram_channel_id": doc.get("telegram_channel_id") or doc.get("telegram_chat_id") or os.environ.get("TELEGRAM_CHAT_ID", ""),
    }


async def channel_status(db) -> dict:
    s = await _meta_settings(db)
    return {
        "telegram": {"configured": bool(s["telegram_bot_token"] and s["telegram_channel_id"])},
        "facebook": {"configured": bool(s["fb_page_id"] and s["fb_page_access_token"])},
        "instagram": {"configured": bool(s["ig_user_id"] and s["ig_access_token"])},
    }


async def post_telegram(db, caption: str, image_url: Optional[str] = None) -> dict:
    s = await _meta_settings(db)
    token, chat_id = s["telegram_bot_token"], s["telegram_channel_id"]
    if not token or not chat_id:
        return {"sent": False, "reason": "Telegram tokens nav iestatīti"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            if image_url:
                url = f"https://api.telegram.org/bot{token}/sendPhoto"
                r = await client.post(url, json={
                    "chat_id": chat_id, "photo": image_url,
                    "caption": caption, "parse_mode": "HTML",
                })
            else:
                url = f"https://api.telegram.org/bot{token}/sendMessage"
                r = await client.post(url, json={
                    "chat_id": chat_id, "text": caption, "parse_mode": "HTML",
                })
        if r.status_code == 200:
            data = r.json()
            return {"sent": True, "id": data.get("result", {}).get("message_id")}
        return {"sent": False, "reason": f"Telegram API {r.status_code}: {r.text[:200]}"}
    except Exception as e:
        logger.exception("telegram marketing post failed")
        return {"sent": False, "reason": str(e)[:200]}


async def post_facebook(db, caption: str, image_url: Optional[str] = None) -> dict:
    s = await _meta_settings(db)
    page_id, token = s["fb_page_id"], s["fb_page_access_token"]
    if not page_id or not token:
        return {"sent": False, "reason": "Facebook Page ID vai access token nav iestatīts"}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            if image_url:
                endpoint = f"{GRAPH_API_BASE}/{page_id}/photos"
                r = await client.post(endpoint, params={"access_token": token},
                                      data={"url": image_url, "caption": caption, "published": "true"})
            else:
                endpoint = f"{GRAPH_API_BASE}/{page_id}/feed"
                r = await client.post(endpoint, params={"access_token": token},
                                      data={"message": caption})
        if r.status_code == 200:
            return {"sent": True, "id": r.json().get("id"), "post_id": r.json().get("post_id")}
        err = (r.json() or {}).get("error", {})
        return {"sent": False, "reason": f"FB {err.get('code', r.status_code)}: {err.get('message', r.text[:200])}"}
    except Exception as e:
        logger.exception("facebook post failed")
        return {"sent": False, "reason": str(e)[:200]}


async def post_instagram(db, caption: str, image_url: str) -> dict:
    s = await _meta_settings(db)
    ig_id, token = s["ig_user_id"], s["ig_access_token"]
    if not ig_id or not token:
        return {"sent": False, "reason": "Instagram User ID vai access token nav iestatīts"}
    if not image_url:
        return {"sent": False, "reason": "Instagram nepieciešams attēla URL"}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Step 1: Create container
            r = await client.post(
                f"{GRAPH_API_BASE}/{ig_id}/media",
                params={"access_token": token, "image_url": image_url, "caption": caption},
            )
            if r.status_code != 200:
                err = (r.json() or {}).get("error", {})
                return {"sent": False, "reason": f"IG container {err.get('code', r.status_code)}: {err.get('message', '')}"}
            container_id = r.json().get("id")
            if not container_id:
                return {"sent": False, "reason": "IG: nesaņēma container ID"}
            # Step 2: Poll status
            for _ in range(8):
                await asyncio.sleep(2)
                rs = await client.get(
                    f"{GRAPH_API_BASE}/{container_id}",
                    params={"access_token": token, "fields": "status_code"},
                )
                if rs.status_code == 200 and rs.json().get("status_code") == "FINISHED":
                    break
            # Step 3: Publish
            rp = await client.post(
                f"{GRAPH_API_BASE}/{ig_id}/media_publish",
                params={"access_token": token, "creation_id": container_id},
            )
            if rp.status_code != 200:
                err = (rp.json() or {}).get("error", {})
                return {"sent": False, "reason": f"IG publish {err.get('code', rp.status_code)}: {err.get('message', '')}"}
            return {"sent": True, "id": rp.json().get("id")}
    except Exception as e:
        logger.exception("instagram post failed")
        return {"sent": False, "reason": str(e)[:200]}
