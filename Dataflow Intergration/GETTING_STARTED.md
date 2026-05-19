# Getting Started (15-Minute Setup)

## Prerequisites

- Backend service with public HTTPS endpoint
- Ability to store secrets securely (`.env`, vault, secret manager)
- Access to DataPulseFlow dashboard and API credentials

## 1) Configure Credentials

Set environment variables:

- `DPF_API_BASE_URL=https://api.datapulseflow.com/v1`
- `DPF_API_KEY=dpfl_live_xxxxxxxxxxxxxxxxx`
- `DPF_WEBHOOK_SECRET=dpfwhsec_xxxxxxxxxxxxx`

## 2) Register Webhook Endpoint

Create an endpoint in your backend:

- Example: `POST /integrations/datapulseflow/webhook`

Then register it in DataPulseFlow:

- URL: your public endpoint
- Subscribed events: start with `property.*`, `lead.*`, `sync.*`

## 3) Verify Signatures

Use `DPF_WEBHOOK_SECRET` to verify incoming webhook signatures.
Reject requests with invalid signatures or stale timestamps.

## 4) Handle Events Idempotently

Each event includes:

- `event_id` (globally unique)
- `occurred_at`
- `idempotency_key`

Store processed `event_id` values to avoid duplicate processing.

## 5) Pull Full Objects When Needed

Webhook payloads may be partial. For critical workflows:

1. Accept webhook quickly (2xx)
2. Queue background job
3. Fetch canonical record from API by ID
4. Apply upsert to your database

## 6) Validate End-to-End

- Trigger sample property and lead events
- Confirm updates appear in your system
- Confirm retries are handled without duplicates

## Next

- `AUTHENTICATION.md`
- `WEBHOOKS.md`
- `SDK_EXAMPLES/`

