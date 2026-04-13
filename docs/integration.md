# Integration Guide

> Legacy note: this guide documents the deprecated standalone action repository for historical reference only. New integrations should use `TrustSignal-dev/TrustSignal/github-actions/trustsignal-verify-artifact`.

## Overview

`TrustSignal Verify Artifact` verifies build artifacts in CI, issues signed verification receipts, and returns receipt metadata that downstream systems can use for provenance and later verification workflows.

## Verification Flow

1. The action accepts either `artifact_path` or `artifact_hash`.
2. A SHA-256 digest is computed locally when a file path is provided.
3. The action sends the artifact identity and GitHub workflow context to `POST /api/v1/verify`.
4. TrustSignal returns verification metadata, including a receipt identifier and receipt signature.
5. The workflow stores `receipt_id` for later verification, audit, or provenance workflows.

## Request Contract

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
    "runNumber": "<runNumber>",
    "job": "<job>",
    "commit": "<sha>",
    "actor": "<actor>",
    "ref": "<ref>",
    "refName": "<refName>",
    "eventName": "<eventName>"
  },
  "metadata": {
    "artifactPath": "<optional>"
  }
}
```

## Managed Mode Authentication

Managed mode uses the `x-api-key` header when calling `POST /api/v1/verify`.

That means there are two sides to provision:

1. GitHub repository secret
   - `TRUSTSIGNAL_API_KEY`
2. TrustSignal API backend
   - `API_KEYS` must contain that same key value
   - `API_KEY_SCOPES` must grant that same key at least `verify|read`

Example backend configuration:

```text
API_KEYS=your-live-key
API_KEY_SCOPES=your-live-key=verify|read
```

If the backend is not provisioned to accept the same key value used in GitHub, the action will fail with `403 Forbidden: invalid API key`.

## Outputs

- `verification_id`
- `status`
- `receipt_id`
- `receipt_signature`

If the API omits a distinct verification identifier, the action uses `receipt_id` as a compatibility alias for `verification_id`.

## Validation Status

- Local validation still uses a deterministic mock fetch harness for fast repeatable tests.
- The repository now also includes real GitHub-hosted validation against `https://api.trustsignal.dev`.
- Historical note: the published action `TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0` was exercised from a real GitHub Actions runner before this repo was deprecated.

## Next Steps

- Maintain the live validation workflows in `docs/live-test.md`.
- Keep the backend key provisioning contract documented anywhere `TRUSTSIGNAL_API_KEY` is referenced.
- Do not treat this repository as the active release path. Use the canonical monorepo action path instead.
