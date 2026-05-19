# Troubleshooting Guide

## 401 / Signature Verification Failed

Possible causes:

- Wrong webhook secret
- Body parser mutating payload before verification
- Timestamp outside tolerance

Fix:

1. Verify raw body is used for HMAC.
2. Confirm secret value and key rotation overlap.
3. Check server clock synchronization (NTP).

## Duplicate Records After Retries

Cause:

- Missing event idempotency checks.

Fix:

- Persist processed `event_id` values with TTL or permanent ledger.
- Skip processing when already seen.

## Missing Property Fields

Cause:

- Partial event payload consumed as canonical record.

Fix:

- Treat webhook as trigger.
- Fetch full object from `GET /properties/{property_id}` before upsert.

## Slow Webhook Processing

Cause:

- Heavy work done synchronously in request thread.

Fix:

- Return `202` quickly.
- Push work to queue/worker for async processing.

## Currency/Size Mismatch in UI

Cause:

- Frontend and backend using different transform settings.

Fix:

- Subscribe to `pricing.currency.changed` and `measurement.size_unit.changed`.
- Cache invalidation on settings updates.

