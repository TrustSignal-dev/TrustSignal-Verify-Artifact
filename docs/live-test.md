# Live External Test

The repository now includes two real-runner managed-mode paths:

- `.github/workflows/ci.yml` runs `Live Managed Validation` on pushes and manual dispatches when `TRUSTSIGNAL_API_KEY` is configured.
- `.github/workflows/live-test.yml` runs nightly and on manual dispatch using the published `TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0` action.

Both workflows target the production endpoint:

- `https://api.trustsignal.dev`

## Required Repository Secret

Add this repository secret before expecting live validation to run:

- `TRUSTSIGNAL_API_KEY`

## Expected Results

- The action step completes on a GitHub-hosted runner.
- `verification_status` is `verified`.
- `receipt_id` is populated.
- `verification_id` is populated when the API returns it.

## Notes

- Local validation still uses the repository mock fetch harness. That keeps unit-style coverage deterministic.
- Live validation is intentionally gated behind a secret so pull requests and forks do not attempt production API calls.
