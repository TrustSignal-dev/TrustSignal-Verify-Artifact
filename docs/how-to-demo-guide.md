# How To Demo TrustSignal

This guide is the shortest reliable path to demo both:

- the `TrustSignal Verify Artifact` GitHub Action
- the live TrustSignal verification API behind `https://api.trustsignal.dev`

It is based on a real passing GitHub Actions run and a live production API deployment.

## What to show

Use this order in a live demo:

1. Runner-built release archive verification
2. Drift detection on a mutated release archive
3. Managed verification against the live TrustSignal production API
4. Receipt outputs and follow-on workflow gating

That sequence answers the two evaluator questions that matter first:

- Does it work in GitHub Actions on a real runner?
- Why is this better than just a mock or a checksum script?

## Demo prerequisites

Before you start, confirm these are true:

- Repository secret `TRUSTSIGNAL_API_KEY` is set
- `https://api.trustsignal.dev/health` returns `{"status":"ok",...}`
- The published action version exists:
  - `TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0`

## Part 1: GitHub Action Demo

Open the workflow:

- `.github/workflows/demo.yml`

Then run it from the GitHub Actions UI:

1. Open the repository Actions tab
2. Select `TrustSignal Action Demo`
3. Click `Run workflow`
4. Choose branch `cm/live-action-validation-demo`
5. Run the workflow

Passing example run:

- [TrustSignal Action Demo #23472323481](https://github.com/TrustSignal-dev/TrustSignal-Verify-Artifact/actions/runs/23472323481)

### What each job proves

`Local Receipt Demo`

- The action hashes a real runner-built release archive
- It writes a reusable receipt
- It verifies the same release archive against that saved receipt without calling the API again

`Drift Detection Demo`

- The workflow mutates the contents of a real release archive after issuing a baseline receipt
- Verification detects drift and returns an invalid result
- This shows the action can block downstream deploys on artifact mismatch

`Managed Mode (Live API)`

- The action sends a real release archive hash and GitHub metadata to `api.trustsignal.dev`
- TrustSignal returns a real verification result from a live GitHub-hosted runner
- This is the proof point that removes the old "mock only" objection

### Talk track for the action

Use this wording:

- "First we build a real release archive on the runner and generate a portable receipt for it."
- "Next we prove drift detection by mutating that archive and re-checking it."
- "Finally we call the live TrustSignal production API from a GitHub-hosted runner and get a signed verification result back."

## Part 2: TrustSignal App/API Demo

For the app side, the goal is to show that the GitHub Action is not an isolated CI trick. It connects to a live TrustSignal verification service.

Open these endpoints:

- `https://api.trustsignal.dev/health`
- `https://api.trustsignal.dev/api/v1/health`

Expected response:

```json
{"status":"ok","database":{"ready":true,"initError":null}}
```

Then explain the managed verification flow:

1. The action computes a SHA-256 digest for a real runner-built release archive
2. It sends the digest and GitHub run context to `POST /api/v1/verify`
3. TrustSignal validates the request using `x-api-key`
4. The API returns verification metadata and receipt identifiers
5. The workflow can gate release steps on the returned verification state

### What to emphasize

- TrustSignal supports receipt-based re-verification of a real release archive, not just a live API call
- Managed mode gives a centralized verification trail
- The API now accepts the canonical TrustSignal key path used by the GitHub Action
- The same production service that the app uses is the one the action hits

## Copy-paste demo workflow

Use this when demoing in another repository:

```yaml
name: TrustSignal Demo

on:
  workflow_dispatch:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build release archive
        run: |
          mkdir -p build/release
          cp README.md build/release/README.md
          cp action.yml build/release/action.yml
          tar -czf build/trustsignal-demo-release.tgz -C build/release .

      - name: Create local receipt
        id: local
        uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0
        with:
          mode: local
          path: build/trustsignal-demo-release.tgz

      - name: Verify locally against saved receipt
        uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0
        with:
          mode: local
          path: build/trustsignal-demo-release.tgz
          receipt: ${{ steps.local.outputs.receipt_path }}

      - name: Verify with TrustSignal API
        id: managed
        uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.0
        with:
          mode: managed
          path: build/trustsignal-demo-release.tgz
          api_base_url: https://api.trustsignal.dev
          api_key: ${{ secrets.TRUSTSIGNAL_API_KEY }}

      - name: Show outputs
        run: |
          echo "Status: ${{ steps.managed.outputs.verification_status }}"
          echo "Verification ID: ${{ steps.managed.outputs.verification_id }}"
          echo "Receipt ID: ${{ steps.managed.outputs.receipt_id }}"
```

## Failure modes to mention

These are worth showing because they make the product feel real:

- `403 Forbidden: invalid API key`
  - backend key provisioning mismatch
- `verification_status=invalid`
  - artifact drift or receipt mismatch
- `400 Invalid payload`
  - caller reached the live API but sent a malformed request

## Recommended screenshots

If you turn this into a public walkthrough, capture these five screens:

1. Workflow dispatch modal
2. `Local Receipt Demo` passing
3. `Drift Detection Demo` showing the expected failure condition
4. `Managed Mode (Live API)` passing
5. API health endpoint returning `status: ok`

## References

- [README.md](../README.md)
- [docs/demo.md](./demo.md)
- [docs/live-test.md](./live-test.md)
- [docs/integration.md](./integration.md)
