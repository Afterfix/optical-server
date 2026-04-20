# Uploads and print images (404 / CORS)

## Why you get 404 on `https://api.accountx.app/uploads/...`

In production the response is from **nginx** (e.g. `Server: nginx/1.24.0`), not from Node. So either:

1. **Nginx is not serving `/uploads`** – requests never reach the Node app, and nginx returns its own 404.
2. **The file is not on the server** – the path is correct but that exact file (e.g. `header_image-1770334241778-725294349.jpeg`) does not exist in `uploads/gadgetx/<tenantId>/print/image/` on the production host.

## Option A: Use the API image proxy (recommended)

The app serves print images via the API so CORS and nginx are not an issue:

- **Header image:** `GET /api/gadgetx/print/image/:tenantId/:filename`
- **QR image:** `GET /api/gadgetx/print/qr/:tenantId/:filename`

The API responses already include proxy paths:

- **Print settings:** `header_image_proxy_path`, `qr_image_proxy_path`
- **Sales (receipt):** `store.header_image_proxy_path`

Use them in the frontend as: **`API_BASE + header_image_proxy_path`** (e.g. `https://api.accountx.app/api/gadgetx/print/image/40/header_image-xxx.jpeg`). No auth required; CORS is set by the API.

## Option B: Let nginx serve `/uploads`

If you prefer direct `/uploads/...` URLs:

1. **Proxy to Node** – e.g. `location /uploads { proxy_pass http://localhost:5000; }` (and add CORS in nginx or rely on Node’s CORS for that route).
2. **Or alias to disk** – e.g. `location /uploads { alias /path/to/wheelx-server/uploads; add_header Access-Control-Allow-Origin $http_origin; }`.

Ensure the **file exists** on the server at `uploads/gadgetx/<tenantId>/print/image/<filename>`. If the DB points to a filename that was never deployed (e.g. only exists locally), you get 404; fix the file or re-upload the logo.
