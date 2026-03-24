# Troubleshooting (TrustSignal Verify Artifact)

This page is written for beginners. If you get stuck, start here.

## Action not running

What happened  
You pushed code, but you don’t see any TrustSignal logs in GitHub.

Why it happens  
- The workflow file is not in the right place (`.github/workflows/…`).
- The workflow only runs on certain events (for example, `workflow_dispatch` means “manual run”).
- The workflow file has YAML indentation issues.

How to fix it  
1) Confirm the file path is exactly `.github/workflows/verify.yml`.  
2) In GitHub, open **Actions** and manually run the workflow if it uses `workflow_dispatch`.  
3) Check the workflow file indentation (YAML is spacing-sensitive).

## API key missing

What happened  
You used `mode: managed` and the action failed with an error like “api_base_url and api_key are required”.

Why it happens  
Managed mode talks to the TrustSignal API, so it needs two secrets.

How to fix it  
1) In GitHub: **Settings → Secrets and variables → Actions**  
2) Add secrets:
   - `TRUSTSIGNAL_API_BASE_URL` (example: `https://api.trustsignal.dev`)
   - `TRUSTSIGNAL_API_KEY`
3) Reference them in your workflow:
   - `api_base_url: ${{ secrets.TRUSTSIGNAL_API_BASE_URL }}`
   - `api_key: ${{ secrets.TRUSTSIGNAL_API_KEY }}`

## Verification failed

What happened  
The action reports a failure (managed mode) or exits with an error (local verification).

Why it happens  
- The artifact you verified does not match the stored receipt (drift).
- In managed mode: the TrustSignal API returned `invalid` for the verification result.

How to fix it  
1) If you expect the file to be unchanged, rebuild it and verify again.  
2) If you expect changes, generate a new receipt to create a new baseline.  
3) In managed mode, confirm your API base URL is correct and reachable.

## Artifact drift detected

What happened  
You see:

```text
✖ Artifact drift detected
File no longer matches original receipt
```

Why it happens  
The file’s fingerprint today does not match the fingerprint stored in the receipt. That means the file changed.

How to fix it  
- If the change was unexpected: investigate your build steps and dependencies.  
- If the change was expected: generate a new receipt and store it as the new baseline.

## Network error

What happened  
Managed mode fails with timeouts or “API request failed”.

Why it happens  
- The TrustSignal API base URL is wrong.
- GitHub’s runner can’t reach the API (temporary outage or network policy).

How to fix it  
1) Double-check `TRUSTSIGNAL_API_BASE_URL`.  
2) Re-run the workflow (temporary issues often resolve).  
3) If it keeps happening, try again later or contact support with the failing run link.

