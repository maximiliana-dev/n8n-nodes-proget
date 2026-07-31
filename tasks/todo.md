# n8n-nodes-proget

Community node package for the Proget MDM API, modeled after `n8n-nodes-trengo`.

## Plan

- [ ] Scaffolding: package.json, tsconfig, eslint, prettier, gulp, editorconfig, ignores
- [ ] `totp.ts`: dependency-free RFC 6238 TOTP (base32 seed) + RFC test vectors
- [ ] `multipart.ts`: dependency-free multipart/form-data builder + tests
- [ ] `auth.ts`: two-step Proget login (password -> 401 challenge + cookies -> 2FA TOTP -> JWT), strict HTTPS base URL normalization + tests
- [ ] `ProgetApi.credentials.ts`: expirable `sessionToken` via `preAuthentication`, bearer auth, credential test
- [ ] `GenericFunctions.ts`: authenticated request helper with sanitized errors, APK upload helper
- [ ] `Proget.node.ts`: Device (get, get by IMEI, restart, wipe w/ confirmation, kiosk on/off), Application (create/update from APK), Activation (generate w/ QR binary, auto-enroll by IMEI)
- [ ] Icons, dev environment (docker compose + start.sh), CI workflows, README
- [ ] Verify: build, lint, tests green

## Security decisions

- Zero runtime dependencies beyond `n8n-workflow` (node:crypto only) — minimal supply chain.
- HTTPS enforced on the base URL; credentials in URL, query strings or fragments rejected.
- Password + TOTP seed stored as password-typed credential fields; session JWT in hidden expirable field.
- UUID/IMEI inputs validated before URL interpolation; path segments encoded.
- Wipe requires an explicit confirmation flag.
- API errors sanitized before rethrow (no headers/config leaked into workflow data).
- APK uploads validated (ZIP magic bytes) and filename sanitized.

## Review

(pending)
