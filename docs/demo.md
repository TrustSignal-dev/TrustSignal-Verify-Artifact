# TrustSignal Verify Artifact — Demo

This page explains how to watch a live demo of the `TrustSignal Verify Artifact` GitHub Action running inside GitHub Actions.

## Running the demo

The demo workflow is at [`.github/workflows/demo.yml`](../.github/workflows/demo.yml).

1. Navigate to the **Actions** tab of this repository on GitHub.
2. Select **TrustSignal Action Demo** from the left-hand workflow list.
3. Click **Run workflow** → **Run workflow**.
4. Watch the three jobs run in real time.

No API credentials are needed. The demo uses the built-in local test harness (`scripts/test-local.js`) with a fetch mock to simulate a live TrustSignal API response.

## What each job shows

### Job 1 — `demo-artifact-path`: verify an artifact file

| Step | What you see |
| ---- | ------------ |
| Create demo artifact | A file is written and its SHA-256 digest is printed. |
| Run local test harness | The action entry-point (`dist/index.js`) is exercised end-to-end with a mocked API. The `verified` receipt path and the `invalid` + `fail_on_mismatch` error path are both exercised. |
| Show what a live step looks like | The exact YAML snippet a consumer would copy into their own workflow is echoed to the log. |

### Job 2 — `demo-artifact-hash`: verify a precomputed hash

Demonstrates the alternative input mode where a caller supplies a precomputed SHA-256 digest instead of a file path. The same local test harness validates that both code paths behave correctly.

### Job 3 — `demo-outputs`: action outputs

Simulates and displays the four outputs the action writes to `GITHUB_OUTPUT`:

| Output | Example value |
| ------ | ------------- |
| `verification_id` | `verify-00000000-0000-4000-8000-000000000001` |
| `status` | `verified` |
| `receipt_id` | `00000000-0000-4000-8000-000000000001` |
| `receipt_signature` | `sig-00000000-0000-4000-8000-000000000001` |

## What a live run against the TrustSignal API looks like

For a fully live run against `api.trustsignal.dev` you need repository secrets. See [live-test.md](live-test.md) for the copy-paste workflow and expected output.

A successful live run produces the same four outputs shown above, with real identifiers and a real cryptographic signature from TrustSignal.

## What failure looks like

When `fail_on_mismatch: "true"` and the API returns a non-valid status:

```
::error::TrustSignal verification was not valid. Status: invalid
```

The step is marked ❌ and the job fails, blocking any downstream steps that depend on a successful verification.

When `fail_on_mismatch: "false"`, the step succeeds regardless of the verification outcome and the `status` output captures the non-valid result (`invalid`, `mismatch`, etc.) for downstream inspection.
