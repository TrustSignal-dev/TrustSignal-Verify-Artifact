# Troubleshooting

## `Missing required input: api_base_url`

You used API mode without providing API settings.

Fix: pass `api_base_url` and `api_key`, or provide `receipt` for local receipt verification mode.

## `Either artifact_path or artifact_hash must be provided`

The action needs something to verify.

Fix: set exactly one of:

- `artifact_path` (for a real file), or
- `artifact_hash` (for a known SHA-256 hash)

## `Provide only one of artifact_path or artifact_hash`

You set both inputs.

Fix: keep only one.

## `Artifact drift detected. File no longer matches original receipt.`

The current file fingerprint does not match the saved receipt fingerprint.

Fix options:

1. Confirm this was expected (e.g., you changed/rebuilt the file).
2. Re-issue a new receipt for the new file.
3. Keep `fail_on_mismatch: "false"` (or use `continue-on-error: true`) if you want the workflow to continue for demonstration scenarios.

## `artifact_hash must be a valid SHA-256 hex digest`

Your hash is malformed.

Fix: provide a lowercase or uppercase 64-character SHA-256 hex value (optional `sha256:` prefix is accepted).
