# Property Finder Sync Troubleshooting

## Problem Summary

We hit two persistent issues while integrating Property Finder sync:

1. `sync-property-finder` returned `401 Unauthorized` from Supabase Functions.
2. Browser console repeatedly showed FX API errors (`api.frankfurter.dev` / CORS/404 noise).

Even after sign-out/sign-in and dev server restarts, the errors persisted.

## Root Causes

### 1) Function 401 (gateway/auth mismatch)

- The function endpoint was protected by JWT verification at the edge gateway (`verify_jwt = true`).
- Browser-side invocation/auth state was inconsistent in this environment, producing repeated 401s at gateway level.
- Because failure happened before function logic, this was **not** a Property Finder scope issue.

### 2) Frankfurter noise in browser

- External FX calls from frontend introduced runtime instability (CORS/404/cache extension noise).
- This was unrelated to Property Finder, but polluted logs and debugging.

## Fix Implemented

### A) Stabilized function auth path

- Set `verify_jwt = false` in `supabase/config.toml` for `sync-property-finder`.
- Added in-function auth guard inside `supabase/functions/sync-property-finder/index.ts`:
  - Require `Authorization: Bearer <token>`.
  - Validate token with `supabase.auth.getUser(jwt)`.
  - Return `401` with explicit message if token missing/invalid.

This keeps the function protected, but avoids the edge-gateway rejection loop.

### B) Removed external FX request dependency

- Updated `src/lib/exchangeRates.ts` to use `FALLBACK_RATES_FROM_AED` only.
- No frontend calls to Frankfurter now.

### C) Server-side daily rates refresh (2026-11-01)

- Edge Function `refresh-exchange-rates` fetches USD→EUR/GBP from Frankfurter server-side (no CORS),
  converts via the AED–USD peg (3.6725), and stores `site_settings.fx_rates_from_aed`.
- It refuses a rate that moved more than 15% since the last refresh; Admin → Integrations can save anyway.
- `pg_cron` runs it daily at 06:00 UTC (migration `20261101090000_fx_rates_daily_refresh.sql`,
  which reads `project_url` and `service_role_key` from Vault).
- The browser reads only the stored row (cached 1 hour) and still uses `FALLBACK_RATES_FROM_AED`
  if the row is missing or invalid. Still no frontend calls to Frankfurter.

## Current Required Secrets (Edge Functions)

- `PF_API_KEY`
- `PF_API_SECRET`
- `APP_SUPABASE_URL`
- `APP_SUPABASE_SERVICE_ROLE_KEY`

Notes:
- Do not use `VITE_` keys for server secrets.
- `SUPABASE_` prefix may be reserved in some secret UI flows; `APP_` avoids that.

## Deployment Step Required After Changes

```bash
cd "c:\Users\User\Videos\CD"
supabase functions deploy sync-property-finder
```

## Verification Checklist

1. Login to admin.
2. Run **Integrations → Run Property Finder sync**.
3. Confirm no 401 in Function Invocations.
4. Confirm `properties` rows with:
   - `listing_source = property_finder`
   - `pf_listing_id` populated
5. Confirm `site_settings` updated:
   - `pf_last_sync_at`
   - `pf_last_sync_summary`

## If It Fails Again

Check function invocation response body:

- `Missing bearer token.` -> client did not send Authorization header.
- `Invalid auth token.` -> token expired/invalid; re-login and retry.

If either repeats, inspect the specific failing request headers in Function logs and compare with current frontend build.
