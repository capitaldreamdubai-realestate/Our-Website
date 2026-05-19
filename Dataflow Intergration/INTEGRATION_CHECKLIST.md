# Integration Go-Live Checklist

## Credentials & Security

- [ ] API key provisioned and stored in secure secret manager
- [ ] Webhook secret stored outside source control
- [ ] Signature verification enabled in production
- [ ] Timestamp replay tolerance enforced

## Webhooks

- [ ] Endpoint publicly reachable over HTTPS
- [ ] `property.*` events processed idempotently
- [ ] `lead.*` events mapped to CRM model
- [ ] Retry handling tested (simulate 5xx responses)

## Synchronization

- [ ] Initial backfill completed for properties
- [ ] Incremental sync schedule configured
- [ ] Lead sync conflict policy defined (last-write wins or versioned)
- [ ] Error queue monitoring in place

## Data Transformations

- [ ] Language conversion settings mapped to supported locales
- [ ] Currency conversion validated for target market currencies
- [ ] Size conversion validated across `sqm/sqft`
- [ ] Filter model parity checked against UI search controls

## CRM / WhatsApp

- [ ] Contact sync tested with live sandbox numbers
- [ ] Inbound message webhook route validated
- [ ] Template sending workflow approved and logged

## Operations

- [ ] Alerting configured for failed sync events
- [ ] Request ID logging enabled for support traceability
- [ ] Rollback plan documented

