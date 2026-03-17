# Live External Test

Use this guide to run the first end-to-end external test of `TrustSignal Verify Artifact` from a separate repository.

## Required Repository Secrets

Add these repository secrets in the external test repository:

- `TRUSTSIGNAL_API_BASE_URL`
- `TRUSTSIGNAL_API_KEY`

## Copy-Paste Workflow

```yaml
name: TrustSignal Live Artifact Test

on:
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  trustsignal-live-test:
    runs-on: ubuntu-latest
    permissions:
      contents: read

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Generate test artifact
        run: |
          mkdir -p dist
          printf 'trustsignal live test artifact\n' > dist/live-test.txt

      - name: Verify artifact with TrustSignal
        id: trustsignal
        uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0
        with:
          api_base_url: ${{ secrets.TRUSTSIGNAL_API_BASE_URL }}
          api_key: ${{ secrets.TRUSTSIGNAL_API_KEY }}
          artifact_path: dist/live-test.txt
          source: github-actions
          fail_on_mismatch: "true"

      - name: Print TrustSignal outputs
        run: |
          echo "verification_id=${{ steps.trustsignal.outputs.verification_id }}"
          echo "status=${{ steps.trustsignal.outputs.status }}"
          echo "receipt_id=${{ steps.trustsignal.outputs.receipt_id }}"
          echo "receipt_signature=${{ steps.trustsignal.outputs.receipt_signature }}"
```

## Expected Outputs

- `verification_id`
- `status`
- `receipt_id`
- `receipt_signature`

`verification_id` may be the same value as `receipt_id` when the API does not return a separate verification identifier.

## What Success Looks Like

- The TrustSignal action step completes successfully.
- `status` is `verified`.
- `receipt_id` is populated.
- `receipt_signature` is populated.
- The job log shows the output values you expect to retain for later verification.

## What Failure Or Mismatch Looks Like

When `fail_on_mismatch` is `true`:

- the TrustSignal step fails
- the workflow job fails
- the error message includes the returned TrustSignal verification status

When `fail_on_mismatch` is `false`:

- the workflow continues
- the `status` output captures the non-valid result such as `invalid` or `mismatch`

## Optional Hash-Based Test

If you already have a SHA-256 digest, replace `artifact_path` with `artifact_hash`:

```yaml
      - name: Verify known digest with TrustSignal
        id: trustsignal
        uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0
        with:
          api_base_url: ${{ secrets.TRUSTSIGNAL_API_BASE_URL }}
          api_key: ${{ secrets.TRUSTSIGNAL_API_KEY }}
          artifact_hash: 2f77668a9dfbf8d5847cf2d5d0370740e0c0601b4f061c1181f58c77c2b8f486
          source: github-actions
          fail_on_mismatch: "true"
```
