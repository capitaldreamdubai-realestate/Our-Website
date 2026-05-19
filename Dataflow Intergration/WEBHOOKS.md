# Webhook Events Reference

Base Delivery Method: `HTTPS POST`  
Content-Type: `application/json`

## Delivery Guarantees

- At-least-once delivery
- Exponential backoff retries (max 24 hours)
- Duplicate deliveries possible (use idempotency)

## Standard Envelope

```json
{
  "event_id": "evt_01JX9DFQ6A5X9YQ2A7T8M3K1P0",
  "event_type": "property.updated",
  "occurred_at": "2026-04-28T07:00:21.221Z",
  "idempotency_key": "idem_01JX9DFQ9MEYV4Q0C0A4YH71P3",
  "account_id": "acc_2nY9vLE3",
  "data": {}
}
```

## Property Events

### `property.created`
### `property.updated`
### `property.deleted`
### `property.published`
### `property.unpublished`

Sample `property.updated` payload:

```json
{
  "event_id": "evt_01JX9E1Y8M8ABFCY9Q3S1WNJ71",
  "event_type": "property.updated",
  "occurred_at": "2026-04-28T07:12:40.101Z",
  "idempotency_key": "idem_01JX9E1YBCKE0QY5DG8QW9H25S",
  "data": {
    "property_id": "pr_839201",
    "reference": "DPF-ALB-4920",
    "status": "active",
    "price": { "amount": 520000, "currency": "USD" },
    "size": { "value": 184, "unit": "sqm" },
    "location": { "city": "Dubai", "country": "AE" },
    "updated_fields": ["price", "size", "description"]
  }
}
```

## Lead Events

### `lead.created`
### `lead.updated`
### `lead.qualified`

Sample:

```json
{
  "event_type": "lead.created",
  "data": {
    "lead_id": "ld_553190",
    "property_id": "pr_839201",
    "channel": "website",
    "full_name": "Amira N.",
    "email": "amira@example.com",
    "phone": "+971500001112",
    "intent": "buy",
    "budget_currency": "AED",
    "budget_amount": 2400000
  }
}
```

## Sync Lifecycle Events

### `sync.property.started`
### `sync.property.completed`
### `sync.property.failed`
### `sync.leads.completed`
### `sync.leads.failed`

Useful for audit dashboards and recovery jobs.

## Localization & Data Transform Events

### `localization.language.changed`
### `pricing.currency.changed`
### `measurement.size_unit.changed`
### `filter.profile.updated`

These events notify consumers when transformation settings or filter models change.

## CRM/WhatsApp Events

### `crm.whatsapp.contact.synced`
### `crm.whatsapp.message.received`

Use to trigger CRM contact upserts and inbound conversation workflows.

## Recommended Response Codes

- `2xx`: accepted/delivered successfully
- `400`: malformed payload (non-retry)
- `401/403`: auth/signature failure (non-retry until fixed)
- `429`: rate-limited (retry)
- `5xx`: transient server issue (retry)

