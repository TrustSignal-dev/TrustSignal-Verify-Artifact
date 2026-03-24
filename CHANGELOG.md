# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- JavaScript action runtime updated from `node20` to `node24` to stay ahead of the GitHub Actions Node 20 deprecation window.
- Nightly live validation now builds and verifies a real `.tgz` release archive so the production validation path matches the demo workflow.

## [0.2.0] - 2026-03-16

### Changed

- `sha256File` now uses a streaming `fs.createReadStream` instead of `fs.readFileSync` to avoid loading large artifacts fully into memory.
- `callVerificationApi` now sends an `accept: application/json` request header so servers that content-negotiate return a parseable response on error.
- `callVerificationApi` now enforces a 30-second request timeout via `AbortController`; a timed-out request surfaces a clear error message rather than stalling the runner indefinitely.
- `buildVerificationRequest` now omits undefined GitHub context fields from the serialized request body instead of serializing them as JSON `null`/omitted keys implicitly.
- `deriveStatus` now uses an explicit string-presence check for `responseBody.status` to avoid treating an empty-string status as absent.
- `normalizeBaseUrl` internal logic simplified; trailing-slash stripping is performed consistently on the final string.

## [0.1.0] - 2024-01-01

### Added

- Initial release of `TrustSignal Verify Artifact` GitHub Action.
- `artifact_path` input: hash a local file with SHA-256 before submitting to the TrustSignal API.
- `artifact_hash` input: submit a precomputed SHA-256 digest directly.
- `api_base_url` and `api_key` inputs for TrustSignal API connectivity.
- `source` input label forwarded in the verification request.
- `fail_on_mismatch` input to control whether a non-valid result fails the workflow step.
- Outputs: `verification_id`, `status`, `receipt_id`, `receipt_signature`.
- GitHub workflow context (`repository`, `workflow`, `runId`, `actor`, `commit`) captured automatically from the runner environment.
- Tolerant response parsing supporting both camelCase and snake_case API response shapes.
- Local contract test suite with mock fetch covering valid, tampered, and fail-on-mismatch scenarios.
