# Authentication & Webhook Security

## API Authentication

DataPulseFlow API uses bearer token authentication.

Header:

`Authorization: Bearer <DPF_API_KEY>`

## Webhook Signature Verification

Incoming webhook requests include:

- `x-dpf-signature` (HMAC SHA256 hex digest)
- `x-dpf-timestamp` (unix timestamp seconds)
- `x-dpf-event-id` (unique event id)

Signature payload format:

`<timestamp>.<raw_request_body>`

Compute:

`HMAC_SHA256(DPF_WEBHOOK_SECRET, signature_payload)`

Compare using constant-time comparison.

## Timestamp Tolerance

Reject if absolute drift exceeds 300 seconds to reduce replay risk.

## Key Rotation

- Maintain active + next secret during rotation window.
- Try verification against both keys during overlap.
- Remove old key after rollout.

## Minimal Validation Checklist

- Header presence check
- Timestamp drift check
- HMAC verification check
- Duplicate event check (`event_id`)
- JSON schema sanity checks

