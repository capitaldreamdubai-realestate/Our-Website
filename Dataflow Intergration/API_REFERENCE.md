# API Reference (v1)

Base URL: `https://api.datapulseflow.com/v1`

All requests require:

- `Authorization: Bearer <DPF_API_KEY>`
- `Content-Type: application/json`

## Health

### `GET /health`

Checks API availability.

## Properties

### `GET /properties/{property_id}`

Returns canonical property details.

### `GET /properties?updated_since=<ISO8601>&limit=100&cursor=<token>`

Incremental property sync pull.

### `POST /sync/properties`

Triggers server-side property reconciliation for account.

Body:

```json
{
  "scope": "incremental",
  "since": "2026-04-27T00:00:00.000Z"
}
```

## Leads

### `GET /leads?updated_since=<ISO8601>&status=open`

Incremental lead sync.

### `POST /sync/leads`

Triggers lead synchronization routine.

## Localization

### `POST /transform/language`

Converts listing text to a target language profile.

```json
{
  "source_locale": "en",
  "target_locale": "ar",
  "fields": ["title", "description", "amenities"]
}
```

### `POST /transform/currency`

Normalizes property price values to target currency.

```json
{
  "source_currency": "USD",
  "target_currency": "AED",
  "amounts": [520000, 715000]
}
```

### `POST /transform/size-unit`

Converts between `sqm` and `sqft`.

```json
{
  "source_unit": "sqm",
  "target_unit": "sqft",
  "values": [45, 120, 184]
}
```

## Filtering

### `POST /filters/real-estate/search`

Evaluate real estate filters and return matching property IDs.

```json
{
  "city": "Dubai",
  "intent": "rent",
  "price_min": 5000,
  "price_max": 15000,
  "bedrooms": [1, 2],
  "property_types": ["apartment", "townhouse"],
  "size_min": 60,
  "size_unit": "sqm"
}
```

## CRM Integrations

### `POST /integrations/whatsapp/sync-contact`

Upserts contact mapping between lead and WhatsApp CRM channel.

### `POST /integrations/whatsapp/send-template`

Dispatches approved template messages.

## Error Model

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "target_currency must be a supported ISO-4217 code",
    "request_id": "req_01JX9G12G6VM8KQ9JMQ4MZ2T4W"
  }
}
```

