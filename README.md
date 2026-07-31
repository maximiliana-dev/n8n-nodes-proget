# 📱 n8n-nodes-proget

Unofficial n8n community node to manage the [Proget MDM](https://proget.pl/) from your workflows: devices, applications (APK upload), activations and automatic enrollment.

## ✨ Operations

### Device

| Operation         | Description                                            |
| ----------------- | ------------------------------------------------------ |
| Get               | Retrieve a device by its UUID                          |
| Get by IMEI       | Look up a device by its IMEI                           |
| Get Groups        | List the groups a device belongs to                    |
| Get Kiosk Profile | Retrieve the kiosk profile assigned to a device        |
| Get Many          | List enrolled devices (with automatic pagination)      |
| Restart           | Reboot a device remotely                               |
| Set Alias         | Change the alias shown for a device                    |
| Wipe              | Factory reset a device (requires confirmation)         |
| Enable Kiosk      | Turn on the kiosk profile                              |
| Disable Kiosk     | Turn off the kiosk profile                             |

### Device Application

| Operation     | Description                                                                           |
| ------------- | ------------------------------------------------------------------------------------- |
| Assign        | Add a catalog application to a device, keeping existing assignments                    |
| Unassign      | Remove an application from a device, keeping the rest (idempotent)                     |
| Get Assigned  | List the applications assigned directly to a device                                    |
| Get Installed | List the application inventory reported by a device (paginated, filterable by package) |
| Get Managed   | List the applications managed on a device                                              |
| Get State     | Required vs actual application state reported by a device                              |
| Get Tasks     | Application task history of a device, newest first                                     |

Assign resolves the package name against the Proget catalog (shop or file origin) and merges it into the current assignments with sensible install defaults (`forceAutoInstall`, uninstall blocked), overridable per node. Assign and Unassign read-modify-write the device assignment list: avoid running them concurrently against the same device.

### Application

| Operation       | Description                                                              |
| --------------- | ------------------------------------------------------------------------ |
| Create From APK | Uploads an APK from binary data and registers it as a new application    |
| Download APK    | Downloads the APK file of a catalog application as binary data           |
| Get Many        | Lists catalog applications, optionally filtered by package name          |
| Update From APK | Uploads an APK and sets it as the new version of an existing application |

Create/Update handle the two-step Proget flow (multipart file upload + application registration) in a single node. Feed them binary data from any upstream node (HTTP Request, Read Binary File, S3, ...). The APK is validated before upload and its filename is sanitized.

### Kiosk Profile

| Operation    | Description                                                             |
| ------------ | ----------------------------------------------------------------------- |
| Get          | Retrieve a kiosk profile by its UUID                                    |
| Allow App    | Add a package to the profile's additional applications (idempotent)     |
| Disallow App | Remove a package from the profile's additional applications (idempotent) |

Allow/Disallow read-modify-write the shared profile allowlist: avoid running them concurrently against the same profile.

### Activation

| Operation          | Description                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Generate           | Creates a manual activation. The QR code is attached as a ready-to-use binary image, plus PIN and identifier in JSON |
| Auto-Enroll by IMEI | Registers an IMEI so the device enrolls automatically on first boot                          |

## 🔐 Credentials

Create a **Proget API** credential with:

| Field       | Value                                                                              |
| ----------- | ---------------------------------------------------------------------------------- |
| Base URL    | Your Proget instance, e.g. `https://yourtenant.proget.cloud` (HTTPS enforced)      |
| Username    | A dedicated service account with the minimum permissions you need                  |
| Password    | The account password                                                               |
| TOTP Secret | The base32 seed shown when enabling two-factor authentication for that account     |

The node performs the full Proget login flow automatically: username/password, then the 2FA challenge answered with a TOTP code derived from the seed. The resulting session token is cached by n8n and refreshed transparently when it expires — you never handle tokens manually.

### Security notes

- Zero runtime dependencies beyond `n8n-workflow`; TOTP and multipart encoding are implemented with Node's `crypto` only, keeping the supply chain minimal.
- HTTPS is enforced on the base URL; URLs with embedded credentials, query strings or fragments are rejected.
- Password and TOTP secret are stored encrypted by n8n and never appear in logs, error messages or workflow data.
- UUIDs, IMEIs and Android package names are validated before being interpolated into API paths and payloads.
- Device wipe requires an explicit confirmation toggle in the node.
- API errors are sanitized before being surfaced (no request headers or configuration leak into executions).

## 🔧 Installation

1. Open your n8n instance
2. Go to **Settings → Community Nodes**
3. Search for `@maximiliana/n8n-nodes-proget`
4. Click **Install**
5. Restart n8n

## 🧑‍💻 Development

```bash
pnpm install
pnpm build          # compile + copy icons
pnpm test           # unit tests (TOTP RFC vectors, multipart, auth flow)
pnpm lint           # n8n community node linter
./dev/start.sh -d   # local n8n at http://localhost:2087 with the node installed
```

## ⚖️ Legal Disclaimer

This node is developed and maintained by Maximiliana (BUKIT APP, S.L.) and has no affiliation with Proget. We are not responsible for any Proget API changes or availability.

The Proget name and trademark belong to their respective owners.

## 📝 License

MIT © Maximiliana (BUKIT APP, S.L.)
