# TrustSignal Verify Artifact

[![Nightly Live Validation](https://github.com/TrustSignal-dev/TrustSignal-Verify-Artifact/actions/workflows/live-test.yml/badge.svg)](https://github.com/TrustSignal-dev/TrustSignal-Verify-Artifact/actions/workflows/live-test.yml)

GitHub Action for hashing build artifacts, creating offline verification receipts, and calling the TrustSignal managed verification API.

## Quickstart

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

      - name: Create local receipt
        id: baseline
        uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0
        with:
          mode: local
          path: dist/release.txt

      - name: Verify against the saved receipt
        uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0
        with:
          mode: local
          path: dist/release.txt
          receipt: ${{ steps.baseline.outputs.receipt_path }}
```

## Managed Mode

Managed mode sends the artifact hash and GitHub run metadata to TrustSignal.

```yaml
- name: Verify with TrustSignal API
  id: trustsignal
  uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0
  with:
    mode: managed
    path: dist/release.txt
    api_base_url: https://api.trustsignal.dev
    api_key: ${{ secrets.TRUSTSIGNAL_API_KEY }}
```

Managed mode requires two things to agree:

- GitHub repository secret `TRUSTSIGNAL_API_KEY`
- TrustSignal API backend config that accepts that same key in `API_KEYS` and grants it `verify|read` in `API_KEY_SCOPES`

If those two sides are out of sync, the action will fail with `403 Forbidden: invalid API key`.

Outputs:

- `sha256`
- `receipt_path`
- `verification_status`
- `verification_id`
- `receipt_id`
- `receipt_signature`

## Why TrustSignal

TrustSignal is not trying to replace GitHub attestations or Sigstore for every supply-chain case. The action is meant for teams that want a low-friction verification layer with portable receipts and an offline drift check.

| Feature | TrustSignal | GitHub Attestations | Sigstore / Cosign |
| --- | --- | --- | --- |
| Zero extra CLI dependencies | Yes | Yes | No |
| Cross-platform receipt workflow | Yes | No | Yes |
| Offline drift check from saved receipt | Yes | No | No |
| Centralized verification service | Yes | No | No |
| SLSA-focused provenance depth | Roadmap | Strong | Strong |
| Setup complexity | Low | Very low | Medium |

The clearest reasons to adopt TrustSignal are:

- Verify an artifact later without calling the API again by using a saved receipt.
- Carry a verification receipt between platforms instead of staying locked to GitHub-native primitives.
- Add a centralized TrustSignal verification trail without requiring a heavier client toolchain.

## Local Drift Detection

The `receipt` input accepts any of these:

- A local path to a receipt JSON file
- Inline receipt JSON containing an artifact hash
- A raw SHA-256 digest

If the current artifact hash does not match the receipt hash, the action returns `verification_status=invalid` and fails when `fail_on_mismatch` is `true`.

## Development

Install dependencies:

```bash
npm ci
```

Run local validation:

```bash
npm run validate:local
```

`validate:local` uses the repository mock fetch harness for managed-mode tests and also rebuilds `dist/index.js` to confirm the committed bundle matches `src/index.js`.

## Live Integration Validation

The repository CI includes a guarded `Live Managed Validation` job that runs on a real GitHub Actions runner against `https://api.trustsignal.dev` whenever `TRUSTSIGNAL_API_KEY` is configured in repository secrets. That job is skipped for pull requests and for repositories without the secret.

The repository also includes a nightly `Live Test Report` workflow that invokes the published `TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0` action against the production API. The badge at the top of this README points to that workflow.

Additional operator notes are in [docs/live-test.md](docs/live-test.md).

For a polished walkthrough that covers both the action demo and the live TrustSignal API/app demo flow, see [docs/how-to-demo-guide.md](docs/how-to-demo-guide.md).

For a portable MDX asset that can be dropped into a Code Hike-style docs site, see [docs/codehike-demo.mdx](docs/codehike-demo.mdx).

For a richer annotated Code Hike-oriented page and a real screencast shot list, see [docs/codehike-demo-annotated.mdx](docs/codehike-demo-annotated.mdx) and [docs/demo-recording-script.md](docs/demo-recording-script.md).

## API Key Provisioning

For managed mode, do not treat the GitHub secret as the only setup step.

The same live key value must exist in both places:

1. GitHub repository secret: `TRUSTSIGNAL_API_KEY`
2. TrustSignal API service environment:
   - `API_KEYS`
   - `API_KEY_SCOPES`

Expected backend format:

```text
API_KEYS=your-live-key
API_KEY_SCOPES=your-live-key=verify|read
```

If you rotate the GitHub secret, rotate the backend allowlist and scope mapping at the same time.

## License

MIT
