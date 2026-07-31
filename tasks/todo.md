# n8n-nodes-proget

Community node package for the Proget MDM API, modeled after `n8n-nodes-trengo`.

## Plan

- [x] Scaffolding: package.json, tsconfig, eslint, prettier, gulp, editorconfig, ignores
- [x] `totp.ts`: dependency-free RFC 6238 TOTP (base32 seed) + RFC test vectors
- [x] `multipart.ts`: dependency-free multipart/form-data builder + tests
- [x] `auth.ts`: two-step Proget login (password -> 401 challenge + cookies -> 2FA TOTP -> JWT), strict HTTPS base URL normalization + tests
- [x] `ProgetApi.credentials.ts`: expirable `sessionToken` via `preAuthentication`, bearer auth, credential test
- [x] `GenericFunctions.ts`: authenticated request helper with sanitized errors, APK upload helper
- [x] `Proget.node.ts`: Device (get, get by IMEI, restart, wipe w/ confirmation, kiosk on/off), Application (create/update from APK), Activation (generate w/ QR binary, auto-enroll by IMEI)
- [x] Icons, dev environment (docker compose + start.sh), CI workflows, README
- [x] Verify: build, lint, tests green

## Security decisions

- Zero runtime dependencies beyond `n8n-workflow` (node:crypto only) — minimal supply chain.
- HTTPS enforced on the base URL; credentials in URL, query strings or fragments rejected.
- Password + TOTP seed stored as password-typed credential fields; session JWT in hidden expirable field.
- UUID/IMEI inputs validated before URL interpolation; path segments encoded.
- Wipe requires an explicit confirmation flag.
- API errors sanitized before rethrow (no headers/config leaked into workflow data).
- APK uploads validated (ZIP magic bytes) and filename sanitized.

## Review

- Build, lint (`eslint-plugin-n8n-nodes-base`) and 27 unit tests green; `pnpm pack` ships only `dist/` + README.
- Auth is handled entirely at the credential level via `preAuthentication` + expirable hidden `sessionToken`, so every node request (and the credential test) reuses the cached JWT and re-logs in transparently on expiry. This mirrors the Bruno pre-request script behavior.
- App upload is a single node operation (upload multipart + create/update), matching the two-step API without exposing it to the user.
- Untested against a live Proget instance: response shapes for `GET /api/mdm/device/?imei=` (used by the credential test) and empty-body command responses are assumed from the Bruno collection.
- Corrections: Proget website is proget.pl (see lessons.md).
