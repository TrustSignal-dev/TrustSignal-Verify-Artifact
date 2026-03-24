# Troubleshooting

## `Missing required input: api_base_url`

You used managed mode without providing the API endpoint.

Fix:

- Pass `api_base_url`, for example `https://api.trustsignal.dev`.
- Pass `api_key`.
- Or switch to local receipt mode if you are not calling the TrustSignal API.

## `Missing required input: api_key`

You used managed mode without providing an API key.

Fix:

1. Add the repository secret `TRUSTSIGNAL_API_KEY` in GitHub Actions secrets.
2. Pass it to the action:

```yaml
with:
  mode: managed
  api_base_url: https://api.trustsignal.dev
  api_key: ${{ secrets.TRUSTSIGNAL_API_KEY }}
```

## `TrustSignal API request failed with status 403: Forbidden: invalid API key`

GitHub reached the TrustSignal API, but the API rejected the key.

This is usually a provisioning problem, not a networking problem.

Fix:

1. Confirm the GitHub repository secret `TRUSTSIGNAL_API_KEY` contains the exact key value you intend to use.
2. In the TrustSignal API service configuration, add that same key value to `API_KEYS`.
3. In the TrustSignal API service configuration, grant that same key at least `verify|read` in `API_KEY_SCOPES`.
4. Redeploy the API service after changing environment variables.

Expected backend format:

```text
API_KEYS=<same-key-value>
API_KEY_SCOPES=<same-key-value>=verify|read
```

If you already have multiple keys, keep them comma-separated in `API_KEYS` and semicolon-separated in `API_KEY_SCOPES`.

## `Either artifact_path or artifact_hash must be provided`

The action needs something concrete to verify.

Fix: provide one of these inputs:

- `path`
- `artifact_path`
- `artifact_hash`

## `Provide only one of artifact_path or artifact_hash`

You passed both a file path and a precomputed hash.

Fix: keep only one input source.

## `artifact_hash must be a valid SHA-256 hex digest`

Your hash is malformed.

Fix: pass a 64-character SHA-256 hex digest. An optional `sha256:` prefix is accepted.

## `Artifact drift detected: artifact does not match receipt`

The current file fingerprint does not match the saved receipt fingerprint.

Fix options:

1. Rebuild the expected artifact and verify again.
2. Issue a new receipt if the artifact was intentionally changed.
3. Use `fail_on_mismatch: "false"` only when you want the workflow to continue after a mismatch.

## Managed mode skipped in demo or live workflows

The repository workflows intentionally skip managed-mode steps unless the secret is present and the event is allowed.

Fix:

- Confirm `TRUSTSIGNAL_API_KEY` is configured in repository secrets.
- Use `workflow_dispatch` for the managed demo job.
- Check the workflow summary to see whether the job was skipped or actually failed.
