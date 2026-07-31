# 📱 n8n-nodes-proget

Unofficial node to manage the [Proget MDM](https://proget.pl/) from n8n workflows.

## 📖 About

This node lets you operate your Proget-managed Android fleet directly from n8n: query and control devices, upload and distribute APKs, manage kiosk profiles and enroll new devices. It handles the full Proget login flow (username/password plus TOTP-based 2FA) automatically, so workflows never touch tokens.

## ✨ Supported Operations

### Device

| Operation         | Description                                     | Supported |
| ----------------- | ----------------------------------------------- | --------- |
| Get               | Retrieve a device by its UUID                   | ✅        |
| Get by IMEI       | Look up a device by its IMEI                    | ✅        |
| Get Groups        | List the groups a device belongs to             | ✅        |
| Get Kiosk Profile | Retrieve the kiosk profile assigned to a device | ✅        |
| Get Many          | List enrolled devices (auto-pagination)         | ✅        |
| Restart           | Reboot a device remotely                        | ✅        |
| Set Alias         | Change the alias shown for a device             | ✅        |
| Wipe              | Factory reset a device (requires confirmation)  | ✅        |
| Enable Kiosk      | Turn on the kiosk profile                       | ✅        |
| Disable Kiosk     | Turn off the kiosk profile                      | ✅        |

### Device Application

| Operation     | Description                                                        | Supported |
| ------------- | ------------------------------------------------------------------ | --------- |
| Assign        | Add a catalog application to a device, keeping existing assignments | ✅        |
| Unassign      | Remove an application from a device, keeping the rest (idempotent)  | ✅        |
| Get Assigned  | List the applications assigned directly to a device                 | ✅        |
| Get Installed | List the application inventory reported by a device                 | ✅        |
| Get Managed   | List the applications managed on a device                           | ✅        |
| Get State     | Required vs actual application state reported by a device           | ✅        |
| Get Tasks     | Application task history of a device, newest first                  | ✅        |

### Application

| Operation       | Description                                                              | Supported |
| --------------- | ------------------------------------------------------------------------ | --------- |
| Create From APK | Upload an APK from binary data and register it as a new application      | ✅        |
| Update From APK | Upload an APK and set it as the new version of an existing application   | ✅        |
| Download APK    | Download the APK file of a catalog application as binary data            | ✅        |
| Get Many        | List catalog applications, optionally filtered by package name           | ✅        |

### Kiosk Profile

| Operation    | Description                                                              | Supported |
| ------------ | ------------------------------------------------------------------------ | --------- |
| Get          | Retrieve a kiosk profile by its UUID                                     | ✅        |
| Allow App    | Add a package to the profile's additional applications (idempotent)      | ✅        |
| Disallow App | Remove a package from the profile's additional applications (idempotent) | ✅        |

### Activation

| Operation           | Description                                                        | Supported |
| ------------------- | ------------------------------------------------------------------ | --------- |
| Generate            | Create a manual activation with QR code (as binary image) and PIN  | ✅        |
| Auto-Enroll by IMEI | Register an IMEI so the device enrolls automatically on first boot | ✅        |

## 🔐 Credentials

Create a **Proget API** credential with the base URL of your instance (HTTPS enforced), a username, its password and the base32 TOTP seed shown when enabling two-factor authentication for that account. Use a dedicated service account with the minimum required permissions.

The node performs the login and 2FA challenge automatically and caches the session token until it expires.

### Security notes

- Zero runtime dependencies beyond `n8n-workflow`; TOTP and multipart encoding are implemented with Node's `crypto` only.
- Password and TOTP seed are stored encrypted by n8n and never appear in logs, errors or workflow data.
- UUIDs, IMEIs and package names are validated before reaching the API; APKs are checked and their filenames sanitized before upload.
- Device wipe requires an explicit confirmation toggle.

## 🔧 Installation

1. Open your n8n instance
2. Go to Settings > Community Nodes
3. Search for "@maximiliana/n8n-nodes-proget"
4. Click Install
5. Restart n8n

## 🧑‍💻 Development

```bash
pnpm install
pnpm build          # compile + copy icons
pnpm test           # unit tests
pnpm lint           # n8n community node linter
./dev/start.sh -d   # local n8n at http://localhost:2087 with the node installed
```

## 🗺️ Roadmap

- [ ] Policy management operations
- [ ] Extended documentation

## 🤝 Contributing

Contributions are welcome! If you have any ideas or improvements, feel free to open a PR.

## ⚖️ Legal Disclaimer

This node is developed and maintained by Maximiliana (BUKIT APP, S.L.) and has no affiliation with Proget. We are not responsible for any Proget API changes or availability.

The Proget name and trademark are property of their respective owners.

## 📝 License

MIT © Maximiliana (BUKIT APP, S.L.)
