# TrustSignal Verify Artifact

Verify artifacts in CI and issue signed verification receipts using TrustSignal.

[![GitHub release](https://img.shields.io/github/v/release/TrustSignal-dev/TrustSignal-Verify-Artifact)](https://github.com/TrustSignal-dev/TrustSignal-Verify-Artifact/releases)
[![License](https://img.shields.io/github/license/TrustSignal-dev/TrustSignal-Verify-Artifact)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](package.json)

`TrustSignal Verify Artifact` is a JavaScript GitHub Action for teams that want a clean verification checkpoint inside CI/CD. It hashes a build artifact or accepts a precomputed SHA-256 digest, submits that identity to TrustSignal, and returns signed receipt metadata your pipeline can persist, attach to release records, or feed into later verification workflows.

TrustSignal is built for artifact integrity, signed receipts, verifiable provenance, and downstream auditability without exposing internal verification engine details.

## Demo

Run the demo workflow directly from the **Actions** tab — no API credentials needed:

1. Go to **Actions → TrustSignal Action Demo**.
2. Click **Run workflow**.
3. Watch the three annotated jobs run in real time.

See [docs/demo.md](docs/demo.md) for a full walkthrough of what each job shows.

## TrustSignal Demo Workflow

A screen-recording-ready workflow is available at `.github/workflows/trustsignal-demo.yml`.
It creates a real demo artifact, calls the TrustSignal action with live credentials, and
prints a clean verification summary.

**Triggers**

| Trigger | How |
| --- | --- |
| Manual | **Actions → TrustSignal Demo → Run workflow** |
| Push | Push any commit to the `demo/trustsignal-action` branch |

**Required repository secrets**

| Secret | Description |
| --- | --- |
| `TRUSTSIGNAL_API_BASE_URL` | Base URL for the TrustSignal API, e.g. `https://api.trustsignal.dev` |
| `TRUSTSIGNAL_API_KEY` | TrustSignal API key for your account |

Add both secrets under **Settings → Secrets and variables → Actions** before running the workflow.

**What the workflow does**

1. Checks out the repository.
2. Creates `dist/demo-artifact.txt` with stable, reproducible content.
3. Prints the SHA-256 digest of the artifact.
4. Runs `TrustSignal-dev/TrustSignal-Verify-Artifact@v0.1.0` against the artifact.
5. Prints a summary with the artifact path, hash, verification status, and receipt ID.

## Features

- Artifact integrity verification
- Signed verification receipts
- CI workflow metadata capture
- Later verification support

## Inputs

| Input | Required | Description |
| --- | --- | --- |
| `api_base_url` | Yes | Base URL for the TrustSignal public API, for example `https://api.trustsignal.dev`. |
| `api_key` | Yes | TrustSignal API key. Pass it from GitHub Actions secrets. |
| `artifact_path` | No | Local path to the artifact file to hash with SHA-256. |
| `artifact_hash` | No | Precomputed SHA-256 digest to verify instead of hashing a local file. |
| `source` | No | Source provider label sent in the verification request. Defaults to `github-actions`. |
| `fail_on_mismatch` | No | When `true`, the action fails on non-valid verification results. Defaults to `true`. |

Provide exactly one of `artifact_path` or `artifact_hash`.

## Outputs

| Output | Description |
| --- | --- |
| `verification_id` | Verification identifier returned by TrustSignal. Falls back to `receipt_id` when the API does not return a separate value. |
| `status` | Normalized verification status returned by the API. |
| `receipt_id` | Signed receipt identifier returned by TrustSignal. |
| `receipt_signature` | Signed receipt signature returned by TrustSignal. |

## Example Workflow

### Verify An Artifact File

```yaml
name: Verify Build Artifact

on:
  push:
    branches: [main]

jobs:
  verify-artifact:
    runs-on: ubuntu-latest
    permissions:
      contents: read

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Build artifact
        run: |
          mkdir -p dist
          echo "release bundle" > dist/release.txt

      - name: Verify artifact with TrustSignal
        id: trustsignal
        uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.1.0
        with:
          api_base_url: https://api.trustsignal.dev
          api_key: ${{ secrets.TRUSTSIGNAL_API_KEY }}
          artifact_path: dist/release.txt
          source: github-actions
          fail_on_mismatch: "true"

      - name: Record verification outputs
        run: |
          echo "Verification ID: ${{ steps.trustsignal.outputs.verification_id }}"
          echo "Status: ${{ steps.trustsignal.outputs.status }}"
          echo "Receipt ID: ${{ steps.trustsignal.outputs.receipt_id }}"
          echo "Receipt Signature: ${{ steps.trustsignal.outputs.receipt_signature }}"
```

### Verify A Precomputed Hash

```yaml
name: Verify Artifact Hash

on:
  workflow_dispatch:

jobs:
  verify-hash:
    runs-on: ubuntu-latest
    permissions:
      contents: read

    steps:
      - name: Verify known digest
        id: trustsignal
        uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.1.0
        with:
          api_base_url: https://api.trustsignal.dev
          api_key: ${{ secrets.TRUSTSIGNAL_API_KEY }}
          artifact_hash: 2f77668a9dfbf8d5847cf2d5d0370740e0c0601b4f061c1181f58c77c2b8f486
          source: github-actions
          fail_on_mismatch: "true"

      - name: Print verification result
        run: |
          echo "Verification ID: ${{ steps.trustsignal.outputs.verification_id }}"
          echo "Status: ${{ steps.trustsignal.outputs.status }}"
```

## Security Model

The action communicates with the TrustSignal API using an API key supplied through GitHub Actions secrets. The key is sent only in the `x-api-key` header. The action hashes local artifacts with SHA-256 when `artifact_path` is used, captures workflow metadata from the GitHub runtime, and returns receipt metadata for downstream verification workflows.

## Why TrustSignal

TrustSignal helps teams add a verification layer to CI/CD without exposing proprietary implementation details in every workflow. The action focuses on artifact identity, signed receipts, provenance continuity, and later verification so integrity signals can travel with the software lifecycle.

## Current Limitations

- The local test path uses a fetch mock rather than a live TrustSignal deployment.
- A production-facing integration test against a deployed TrustSignal API is still pending.
- GitHub Marketplace submission can happen after the first external workflow validation and release tag.

## Live Test

Use a separate repository for the first live run against `api.trustsignal.dev` or your target TrustSignal environment.

Required repository secrets:

- `TRUSTSIGNAL_API_BASE_URL`
- `TRUSTSIGNAL_API_KEY`

Use the copy-paste workflow in [docs/live-test.md](docs/live-test.md). A successful run should produce:

- `verification_id`
- `status=verified`
- `receipt_id`
- `receipt_signature`

If the API returns a non-valid result and `fail_on_mismatch` is `true`, the action step fails. If `fail_on_mismatch` is `false`, the workflow continues and the `status` output captures the mismatch or invalid state.

## Request Contract

The action calls `POST /api/v1/verify` with a generic artifact verification payload:

```json
{
  "artifact": {
    "hash": "<sha256>",
    "algorithm": "sha256"
  },
  "source": {
    "provider": "github-actions",
    "repository": "<repo>",
    "workflow": "<workflow>",
    "runId": "<runId>",
    "commit": "<sha>",
    "actor": "<actor>"
  },
  "metadata": {
    "artifactPath": "<optional>"
  }
}
```

GitHub workflow context is added automatically when those environment variables are available at runtime.

## Local Validation

Run the lightweight validation checks with:

```bash
node --check src/index.js
node --check dist/index.js
node scripts/test-local.js
```

Or use the package scripts:

```bash
npm run check
npm run test:local
npm run validate:local
```

## Versioning Guidance

- Follow semantic versioning.
- Publish immutable release tags such as `v0.1.0`, `v0.2.0`, and `v1.0.0`.
- Maintain a major tag such as `v1` for stable consumers.

## Release Guidance

- Commit the built `dist/index.js` artifact with every release.
- Create signed or otherwise controlled release tags according to your release process.
- Update documentation when the public API contract or output mapping changes.
- Marketplace publication requires a public repository, a root-level `action.yml`, and release tags.

## First Release Checklist

- Confirm `action.yml` is at the repository root.
- Confirm README examples and output mappings are accurate.
- Confirm `node --check src/index.js`, `node --check dist/index.js`, and `node scripts/test-local.js` pass.
- Confirm the external workflow in [docs/live-test.md](docs/live-test.md) passes from a separate repository.
- Create tag `v0.1.0`.
- Push the tag.
- Prepare Marketplace submission later if needed.

## Roadmap

- Add a live integration test against a deployed TrustSignal verification endpoint
- Publish stable release tags for long-lived consumers
- Add example workflows for release pipelines and provenance retention patterns

## Suggested GitHub Topics

- `github-action`
- `devsecops`
- `ci-cd`
- `artifact-integrity`
- `supply-chain-security`
- `compliance`
- `provenance`
- `verification`
