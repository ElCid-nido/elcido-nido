# Aurypet Widget — Cloudflare Worker + Resend

Production-ready, privacy-first chat widget.
- Fuzzy FAQ (Fuse.js) + quick intents
- Lead form: consent required, honeypot, 60s throttle
- Strict CSP; only connects to your Worker (no EmailJS)

## What you must change
1) In `chat.js`: set `WORKER_URL` to your Cloudflare Worker URL.
2) In `chat.html`: replace `https://YOURWORKER.workers.dev` in CSP (`connect-src` and `form-action`) with your Worker URL.
3) Upload `aurypet-logo.png` to repo root (or switch the `<img>` to an emoji).

## How to deploy
- Put all files in your repo root and enable GitHub Pages.
- Test at `/test.html`.
- Embed on any site with the `embed.js` snippet.

## Security model
- No secrets in the browser.
- CSP locked to your Worker.
- Origin allowlist & CORS in Worker.
- No innerHTML; self-hosted Fuse; data minimization.
- TLS enforced in Resend; DKIM/SPF/DMARC set up at the domain.

## Cloudflare Worker code is included below (copy it to your Worker and set env vars):
(See the conversation for full code if needed.)
