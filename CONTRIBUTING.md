# Contributing

## Development Setup

Install dependencies and keep the committed runtime file aligned with the source:

```bash
npm install
npm run build
```

## Local Validation

Run the lightweight validation checks before opening a change:

```bash
node --check src/index.js
node --check dist/index.js
node scripts/test-local.js
```

Or use package scripts:

```bash
npm run check
npm run test:local
npm run validate:local
```

## Repository Structure

- `action.yml`: GitHub Action metadata
- `src/`: source implementation
- `dist/`: committed runtime entrypoint for action consumers
- `scripts/`: local validation helpers
- `docs/`: integration-facing documentation

## Proposing Changes

- Keep changes focused and reviewable.
- Update `README.md` and docs when the action contract or usage changes.
- Rebuild `dist/index.js` if `src/index.js` changes.
- Open a pull request with the validation commands you ran and the expected user-facing impact.

## Release Basics

- Follow semantic versioning.
- Commit updated `dist/index.js` with each release.
- Publish immutable tags such as `v0.2.0` and maintain a major tag such as `v1`.
- GitHub Marketplace publication requires a public repository with `action.yml` at the repository root.
