# Desktop E2E (Playwright)

Paranoid Encryption file upload scenario.

Run from the install root with the interactive launcher (`npm run test:e2e:tui`, pick this module), or directly:

```bash
cd modules/CoreWebclient
npm run test:e2e -- --setup "CoreParanoidEncryptionWebclientPlugin Chrome"
```

Upload encrypts every file with a new AES key and wraps that key with the PRIMARY user's OpenPGP keypair. The test generates that keypair in the browser (private keys live only in localStorage, so each run makes a new one).

Optional env:
- `E2E_OPENPGP_PASSWORD` — passphrase for the generated OpenPGP key; empty for a key without a passphrase.

The generate dialog also counts public keys from contacts on the server, so the test first removes the user's own public key from contacts (`UpdateOwnContactPublicKey` with an empty key) and reloads the app; after the test it removes own public keys from contacts again and checks that none are left. Shared helper: `OpenPgpWebclient/test/e2e/helpers/openpgp-contacts.js`.

Stand gates: Paranoid / OpenPGP settings tabs missing, encrypt-on-upload dialog missing, OpenPGP key generate unavailable.

Setup of the desktop suite: [CoreWebclient/test/e2e/README.md](../../../CoreWebclient/test/e2e/README.md).
