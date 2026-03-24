# Marketplace Readiness Checklist

Status: preparation checklist for GitHub Marketplace publication and trust review. This document does not claim GitHub approval, certification, or partner status.

## Repo-Level Readiness

- `action.yml` exists at repository root
- Action uses committed runtime output in `dist/index.js`
- `README.md` includes:
  - purpose and value proposition
  - inputs
  - outputs
  - permissions guidance
  - security notes
  - example workflows
  - full commit SHA pinning example
- `LICENSE` exists
- `SECURITY.md` exists with private vulnerability reporting path
- `SUPPORT.md` exists with public support contact
- Immutable semantic version tag exists:
  - current tag observed: `v0.1.0`
- Release process maintains immutable version tags and a stable major tag when appropriate
- Documentation avoids claims of GitHub approval or certification

## Recommended Follow-Up Before Marketplace Submission

- Confirm repository is public
- Add or verify GitHub release notes for each published version
- Ensure Marketplace listing copy matches README behavior and avoids roadmap overclaiming
- Consider signed tags for release hygiene
- Confirm support inbox is monitored
- Confirm security inbox is monitored

## Org-Level Readiness

- Publish the action under the organization account, not a personal account
- Verify the organization domain in GitHub organization settings
- Enforce organization-wide 2FA
- Publish a public support email address
- Ensure the org profile and repository metadata consistently reference the same domain and support path
- Review who has admin access to the repository and reduce to the smallest practical set
- Confirm branch protection and release controls for the default branch and release tags

## Verified Creator Outreach Preparation

Before contacting GitHub about Verified creator review:

- Confirm the organization domain is verified on GitHub
- Confirm support and security contact paths are public
- Confirm the Marketplace listing will be published from the verified organization account
- Prepare a short note explaining what the action does and why the org should display a verified creator badge
- Avoid any language implying that GitHub has already approved the listing
