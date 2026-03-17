# TrustSignal Verify Artifact

Verify a file in CI and get a signed receipt you can use later to confirm the file has not changed.

## 2-minute quickstart (copy/paste)

Create `.github/workflows/verify.yml`:

```yaml
name: Verify Artifact

on:
  workflow_dispatch:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build demo artifact
        run: |
          mkdir -p dist
          echo "release bundle v1" > dist/release.txt

      - name: Verify and issue receipt
        id: trustsignal
        uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0
        with:
          api_base_url: https://api.trustsignal.dev
          api_key: ${{ secrets.TRUSTSIGNAL_API_KEY }}
          artifact_path: dist/release.txt

      - name: Print result
        run: |
          echo "status=${{ steps.trustsignal.outputs.status }}"
          echo "receipt_id=${{ steps.trustsignal.outputs.receipt_id }}"
```

Expected success log:

```text
✔ Artifact matches receipt. Integrity verified.
```

## What is “artifact drift”?

Think of a receipt as a fingerprint for your file.

- If the file is unchanged, the fingerprint still matches.
- If the file changed (even by 1 byte), it no longer matches.

That mismatch is **artifact drift**.

Expected drift log:

```text
✖ Artifact drift detected. File no longer matches original receipt.
```

## Local receipt check (no API call)

You can verify a local file against a saved receipt JSON.

```yaml
- name: Verify against saved receipt
  id: receipt-check
  continue-on-error: true
  uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0
  with:
    artifact_path: dist/release.txt
    receipt: ${{ vars.RELEASE_RECEIPT_JSON }}
    fail_on_mismatch: "true"
```

`receipt` can be:

- a full JSON object with `artifact.hash` (or `artifact_hash`), and optionally `receipt_id`
- or a plain 64-char SHA-256 hash string

## Inputs

| Input | Required | Description |
| --- | --- | --- |
| `artifact_path` | One of (`artifact_path`, `artifact_hash`) | File to hash locally. |
| `artifact_hash` | One of (`artifact_path`, `artifact_hash`) | Precomputed SHA-256 hash. |
| `receipt` | No | Local receipt JSON/hash for drift detection without API. |
| `api_base_url` | Required when `receipt` is not set | TrustSignal API base URL. |
| `api_key` | Required when `receipt` is not set | TrustSignal API key. |
| `source` | No | Source label (default: `github-actions`). |
| `fail_on_mismatch` | No | Fail step on mismatch (default: `true`). |

## Outputs

- `verification_id`
- `status`
- `receipt_id`
- `receipt_signature`

## How it works

```text
artifact file -> sha256 fingerprint -> TrustSignal receipt -> later verify fingerprint again
```

## Local validation

```bash
npm install
npm run validate:local
```

For common setup issues, see [docs/troubleshooting.md](docs/troubleshooting.md).
