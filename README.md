# Capital Dream Website

## Deploying on Hostinger

This project is a Vite SPA with React Router. Direct visits to routes like `/about` or `/admin` require a server fallback to `index.html`.

### What is already configured

- `public/.htaccess` is included and rewrites unknown paths to `index.html` for Apache hosting.
- Router mode can be changed with `VITE_ROUTER_MODE`:
  - `browser` (default): clean URLs, requires rewrite rules.
  - `hash`: fallback mode if rewrites cannot be enabled.

### Deployment steps

1. Set production `.env` values (at minimum `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
2. Build:

```bash
npm install
npm run build
```

3. Upload the content of `dist/` to your Hostinger `public_html` directory.
4. Confirm `.htaccess` exists in `public_html` after upload.
5. Test direct reload on nested routes:
   - `/about`
   - `/contact-us`
   - `/admin/login`

If your Hostinger plan does not honor `.htaccess`, set `VITE_ROUTER_MODE=hash` before build and redeploy.
