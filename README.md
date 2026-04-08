# Deprecated: TrustSignal Verify Artifact

> Status: `deprecated` `archived`
>
> This repo is historical only. The canonical GitHub Action source lives in `TrustSignal/github-actions/trustsignal-verify-artifact`.

## Source of Truth

Canonical repo roles and ownership are defined in [TrustSignal/docs/REPO_ROLES.md](https://github.com/TrustSignal-dev/TrustSignal/blob/master/docs/REPO_ROLES.md).

This repository is no longer the canonical TrustSignal GitHub Action.

## Canonical action

Use the monorepo action instead. The path below is the active replacement, not an invitation to keep publishing from this repository:

- `TrustSignal/github-actions/trustsignal-verify-artifact`
- Workflow path: `TrustSignal-dev/TrustSignal/github-actions/trustsignal-verify-artifact`
- Pinning note: this repo set does not currently document a confirmed public monorepo release ref. Pin to a maintainer-published release tag or commit SHA.

The canonical product stack is:

1. API: `TrustSignal/apps/api`
2. Public frontend: `v0-signal-new`
3. GitHub App backend: `TrustSignal-App`
4. GitHub Action: `TrustSignal/github-actions/trustsignal-verify-artifact`

## Why this repo is deprecated

This repository drifted away from the canonical action contract:

- it uses a different auth path than the monorepo action
- it documents the old env allowlist model
- it creates ambiguity about which action pilots should install

History is preserved here for reference, but pilots should not publish from or integrate against this repository.

## Migration

1. Stop using `TrustSignal-dev/TrustSignal-Verify-Artifact`.
2. Move workflows to `TrustSignal-dev/TrustSignal/github-actions/trustsignal-verify-artifact`.
3. Pin the action to a maintainer-published release tag or commit SHA. Do not assume a stable major alias exists until the monorepo release policy documents one.
4. Keep using the secret name `TRUSTSIGNAL_API_KEY`.
5. Target `https://api.trustsignal.dev`.

## Status

Archived/deprecated surface only. No new releases should be cut from this repository.
