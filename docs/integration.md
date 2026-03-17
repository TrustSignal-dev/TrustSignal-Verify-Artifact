# Integration Guide

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
    "commit": "<sha>",
    "actor": "<actor>"
  },
  "metadata": {
    "artifactPath": "<optional>"
  }
}
```

## Outputs

- `verification_id`
- `status`
- `receipt_id`
- `receipt_signature`

If the API omits a distinct verification identifier, the action uses `receipt_id` as a compatibility alias for `verification_id`.

## Current Limitations

- The included test path uses a local fetch mock rather than a live TrustSignal deployment.
- A live external workflow validation is still pending before the first public release tag.

## Next Steps

- Run the external workflow in `docs/live-test.md` against a deployed TrustSignal API environment.
- Publish semantic version tags beginning with `v0.2.0`.
- Maintain a stable major tag once the action contract is proven in production use.
