"""
DataPulseFlow webhook starter (Python + FastAPI)
Install: pip install fastapi uvicorn
Run: uvicorn python-fastapi-webhook-handler:app --reload --port 5051
"""
import hashlib
import hmac
import os
import time
from typing import Set

from fastapi import FastAPI, Header, HTTPException, Request

app = FastAPI()
DPF_WEBHOOK_SECRET = os.getenv("DPF_WEBHOOK_SECRET", "dpfwhsec_replace_me")
processed_events: Set[str] = set()


def verify_signature(raw_body: str, timestamp: str, signature: str) -> bool:
  try:
    ts = int(timestamp)
  except Exception:
    return False

  if abs(int(time.time()) - ts) > 300:
    return False

  payload = f"{timestamp}.{raw_body}".encode("utf-8")
  expected = hmac.new(
    DPF_WEBHOOK_SECRET.encode("utf-8"),
    payload,
    hashlib.sha256,
  ).hexdigest()
  return hmac.compare_digest(expected, signature)


@app.post("/integrations/datapulseflow/webhook")
async def datapulseflow_webhook(
  request: Request,
  x_dpf_timestamp: str = Header(default=""),
  x_dpf_signature: str = Header(default=""),
):
  raw_bytes = await request.body()
  raw_body = raw_bytes.decode("utf-8")

  if not verify_signature(raw_body, x_dpf_timestamp, x_dpf_signature):
    raise HTTPException(status_code=401, detail="invalid signature")

  event = await request.json()
  event_id = event.get("event_id")
  event_type = event.get("event_type")
  if not event_id or not event_type:
    raise HTTPException(status_code=400, detail="invalid event envelope")

  if event_id in processed_events:
    return {"status": "duplicate_ignored"}
  processed_events.add(event_id)

  # In production, dispatch to async task queue.
  if event_type == "property.updated":
    print("property.updated", event.get("data", {}).get("property_id"))
  elif event_type == "lead.created":
    print("lead.created", event.get("data", {}).get("lead_id"))
  elif event_type == "crm.whatsapp.contact.synced":
    print("crm.whatsapp.contact.synced", event.get("data", {}).get("contact_id"))
  else:
    print("Unhandled event", event_type)

  return {"status": "accepted"}


@app.get("/health")
def health():
  return {"status": "ok", "service": "datapulseflow-webhook-starter"}

