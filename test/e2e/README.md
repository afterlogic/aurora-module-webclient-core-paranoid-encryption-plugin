# Desktop E2E (Playwright)

Paranoid Encryption file upload scenario.

```bash
npm run test:e2e-desktop -- --setup "CoreParanoidEncryptionWebclientPlugin Chrome"
```

Optional env:
- `E2E_OPENPGP_PASSWORD` — **required** (Paranoid wraps the file key with the user's OpenPGP keypair)
- `E2E_PARANOID_PASSWORD` — optional legacy jscrypto key UI (defaults to `e2e-paranoid-test`)

Stand gates: Paranoid / OpenPGP settings tabs missing, encrypt-on-upload dialog missing, OpenPGP key generate unavailable.
