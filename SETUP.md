# Admin panel setup

The site now has a password-protected editor at **`/admin`** that lets a client
change any text on the page (name, bio, stats, email) by clicking on it and
hitting **Publish**. Edits are stored in Vercel KV and shown to all visitors.

## One-time Vercel setup

1. **Add a KV store** (this is where the edited text lives)
   - Vercel dashboard → your project → **Storage** → **Create Database** → **KV**
     (Upstash Redis).
   - Click **Connect** to link it to this project. Vercel injects the
     `KV_REST_API_URL` / `KV_REST_API_TOKEN` env vars automatically — no manual
     copying needed.

2. **Set the admin password** (and a signing secret)
   - Project → **Settings** → **Environment Variables**, add:
     - `ADMIN_PASSWORD` = `RespectiveChris1`
     - `ADMIN_SECRET` = any long random string (used to sign the login cookie).
       Optional but recommended; if omitted the password itself is used.
   - Apply to **Production** (and Preview if you want it there too).

3. **Redeploy** so the new env vars and functions take effect.

That's it. Visit `/admin`, enter the password, click any text to edit, then
**Publish**. Changes go live for everyone on the main site immediately.

> Changing `ADMIN_PASSWORD` later will log the client out (they just sign in
> again with the new password).

## How it works

| File | Role |
|------|------|
| `index.html` | Public site. Loads saved overrides from `/api/content` and applies them. |
| `admin.html` + `admin.js` | Editor. Injects the exact hero markup from the public page (so it's always 1:1), lets you edit inline, and POSTs to `/api/content`. |
| `styles.css`, `matrix.js`, `content.js` | Shared by both pages (single source of truth for look + fields). |
| `api/login.js` / `session.js` / `logout.js` | Password auth via `ADMIN_PASSWORD`, signed HttpOnly cookie. |
| `api/content.js` | `GET` returns saved text (public); `POST` saves it (auth required, sanitized). |
| `lib/auth.js` | Cookie signing/verification helpers. |

## Editable fields

Name (first / last), the bio paragraph (keeps **bold** words), each stat value
and label, and the contact email (the `mailto:` link updates automatically).

## Local development

`npx serve` (the existing preview) serves the static pages, but the `/api`
functions and KV only run on Vercel. To exercise the full login/publish loop
locally, use `vercel dev` after linking the project. Without it, the public
site still renders from its built-in defaults.
