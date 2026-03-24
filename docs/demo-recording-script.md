# TrustSignal Demo Recording Script

This is the live recording plan for a real screencast.

Use it when capturing with Loom, Screen Studio, QuickTime, or another recorder.

## Recording Goal

Produce one 2-3 minute demo that shows:

1. how to add the GitHub Action
2. how to run it on a real release archive
3. how to show drift detection on a mutated archive
4. how to show the live TrustSignal API/app side

## Before You Record

Have these ready:

- repository open to the Actions tab
- `.github/workflows/demo.yml` open in another tab
- `https://api.trustsignal.dev/health` ready in another tab
- the passing example run available:
  - `https://github.com/TrustSignal-dev/TrustSignal-Verify-Artifact/actions/runs/23472323481`

Confirm:

- `TRUSTSIGNAL_API_KEY` is configured in the repo
- `https://api.trustsignal.dev/health` returns `status: ok`

## Shot List

### Shot 1: Show the workflow file

Duration:

- 15-20 seconds

What to do:

- open `.github/workflows/demo.yml`
- scroll just enough to show the three jobs

Say:

- "This workflow demonstrates three paths: verifying a real release archive locally, detecting drift on that archive, and live verification against TrustSignal production."

### Shot 2: Trigger the workflow

Duration:

- 10-15 seconds

What to do:

- switch to GitHub Actions
- select `TrustSignal Action Demo`
- click `Run workflow`
- pick `cm/live-action-validation-demo`
- run it

Say:

- "We’re running this on a real GitHub-hosted runner, not a local harness."

### Shot 3: Show the jobs start

Duration:

- 10-15 seconds

What to do:

- show the completed run summary with all three jobs visible

Say:

- "This is the first proof point: the workflow is executing live inside GitHub Actions."

### Shot 4: Show local receipt success

Duration:

- 20-25 seconds

What to do:

- open `Local Receipt Demo`
- show the step that creates the baseline receipt
- show the step that verifies against the saved receipt

Say:

- "First we create a portable receipt for a real runner-built release archive. Then we verify that same archive against the saved receipt without calling the API again."

### Shot 5: Show drift detection

Duration:

- 20-25 seconds

What to do:

- open `Drift Detection Demo`
- point to the mutate step
- point to the verification result that indicates drift

Say:

- "Next we change the release archive after issuing the receipt. TrustSignal detects the mismatch, which is the release-gating story."

### Shot 6: Show managed mode passing

Duration:

- 20-30 seconds

What to do:

- open `Managed Mode (Live API)`
- show the passing action step
- show the outputs if visible

Say:

- "Finally we switch to managed mode. The action sends the release archive hash and GitHub metadata to the live TrustSignal production API and gets a real verification result back."

### Shot 7: Show the TrustSignal API/app side

Duration:

- 15-20 seconds

What to do:

- switch to `https://api.trustsignal.dev/health`
- refresh if needed
- show the `status: ok` response
- optionally show `https://api.trustsignal.dev/api/v1/health`

Say:

- "To close the loop, here is the live TrustSignal service the action is using. This is the production verification endpoint, and it is healthy."

### Shot 8: End on the value proposition

Duration:

- 10-15 seconds

What to do:

- return to the run summary page

Say:

- "So the demo proves three things: real archive verification, drift detection on a changed archive, and live GitHub-to-TrustSignal verification on a real runner."

## Tight 90-Second Version

If you need a shorter cut:

1. show the workflow YAML
2. show the run summary with all jobs passing
3. open managed mode and point to the live verification step
4. show `api.trustsignal.dev/health`

## Common Mistakes During Recording

- do not start with backend setup details
- do not spend too long in workflow YAML
- do not hide the GitHub Actions job names
- do not skip the API health check at the end

## Supporting Assets

Use these repo assets when editing the video or building the docs version:

- [codehike-demo.mdx](./codehike-demo.mdx)
- [codehike-demo-annotated.mdx](./codehike-demo-annotated.mdx)
- [how-to-demo-guide.md](./how-to-demo-guide.md)
- [workflow-dispatch.png](./demo-assets/workflow-dispatch.png)
- [run-summary-success.png](./demo-assets/run-summary-success.png)
- [local-demo-success.png](./demo-assets/local-demo-success.png)
- [managed-job-details.png](./demo-assets/managed-job-details.png)
