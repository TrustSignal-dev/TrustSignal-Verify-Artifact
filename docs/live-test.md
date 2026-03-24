# Live External Test

The repository now includes two real-runner managed-mode paths:

- `.github/workflows/ci.yml` runs `Live Managed Validation` on pushes and manual dispatches when `TRUSTSIGNAL_API_KEY` is configured.
- `.github/workflows/live-test.yml` runs nightly and on manual dispatch using the published `TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0` action.

Both workflows target the production endpoint:

- `https://api.trustsignal.dev`

## Required Repository Secret

Add this repository secret before expecting live validation to run:

- `TRUSTSIGNAL_API_KEY`

## Required Backend Configuration

The GitHub repository secret is only half of the setup. The API backend must also be configured to accept that same key.

Required API service configuration:

- `API_KEYS` includes the exact same key value stored in `TRUSTSIGNAL_API_KEY`
- `API_KEY_SCOPES` grants that same key at least `verify|read`

Example:

```text
API_KEYS=your-live-key
API_KEY_SCOPES=your-live-key=verify|read
```

After changing backend environment variables, redeploy the API service before rerunning the workflow.

## Expected Results

- The workflow builds a real `.tgz` release archive on a GitHub-hosted runner before verification.
- The action step completes on a GitHub-hosted runner.
- `verification_status` is `verified`.
- `sha256` is populated for the archive that was verified.
- `receipt_id` is populated.
- `verification_id` is populated when the API returns it.

## Notes

- Local validation still uses the repository mock fetch harness. That keeps unit-style coverage deterministic.
- Live validation is intentionally gated behind a secret so pull requests and forks do not attempt production API calls.
- The nightly workflow now mirrors the demo flow by verifying a real archive instead of a placeholder text file.
