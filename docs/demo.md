# TrustSignal Verify Artifact — Demo

This page explains how to watch a live demo of the `TrustSignal Verify Artifact` GitHub Action running inside GitHub Actions.

## Running the demo

The demo workflow is at [`.github/workflows/demo.yml`](../.github/workflows/demo.yml).

1. Navigate to the **Actions** tab of this repository on GitHub.
2. Select **TrustSignal Action Demo** from the left-hand workflow list.
3. Click **Run workflow** → **Run workflow**.
4. Watch the jobs run in real time.

The demo workflow now invokes the published action directly in every demo step using `TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0`. No mock harness is used in `demo.yml`.

## What each job shows

### Job 1 — `local-receipt-demo`: generate and verify a real local receipt

| Step | What you see |
| ---- | ------------ |
| Create demo artifact | A file is written to the runner workspace. |
| Generate baseline receipt | The published action runs in `local` mode and writes a real receipt file. |
| Verify artifact against saved receipt | The published action runs again and verifies that the artifact still matches the saved receipt. |

### Job 2 — `drift-detection-demo`: show a real failure path

This job mutates the artifact after generating a baseline receipt, then invokes the action again with `continue-on-error: true`. The job asserts that the action step fails because drift was detected.

### Job 3 — `managed-live-demo`: real TrustSignal API verification

This job only runs on manual dispatch and only when `TRUSTSIGNAL_API_KEY` is configured. It calls `https://api.trustsignal.dev` from a GitHub-hosted runner and prints the actual outputs returned by the action.

| Output | Example value |
| ------ | ------------- |
| `verification_id` | `verify-...` |
| `status` | `verified` |
| `receipt_id` | `...` |
| `receipt_signature` | `...` |

## What a live run against the TrustSignal API looks like

For a fully live run against `api.trustsignal.dev` you need repository secrets. See [live-test.md](live-test.md) for the copy-paste workflow and expected output.

## What failure looks like

When `fail_on_mismatch: "true"` and the API returns a non-valid status:

```
::error::TrustSignal verification was not valid. Status: invalid
```

The step is marked ❌ and the job fails, blocking any downstream steps that depend on a successful verification.

When `fail_on_mismatch: "false"`, the step succeeds regardless of the verification outcome and the `status` output captures the non-valid result (`invalid`, `mismatch`, etc.) for downstream inspection.
