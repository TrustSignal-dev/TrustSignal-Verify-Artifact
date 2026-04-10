# TrustSignal Verify Artifact



[![Nightly Live Validation](https://github.com/TrustSignal-dev/TrustSignal-Verify-Artifact/actions/workflows/live-test.yml/badge.svg)](https://github.com/TrustSignal-dev/TrustSignal-Verify-Artifact/actions/workflows/live-test.yml)

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-TrustSignal--Verify--Artifact-blue?logo=github)](https://github.com/marketplace/actions/trustsignal-verify-artifact)



GitHub Action for hashing build artifacts, creating offline verification receipts, and calling the TrustSignal managed verification API.



→ [Plain-English Setup Guide](docs/plain-english-setup.md) · [How to Demo](docs/how-to-demo-guide.md) · [Deck (PDF)](docs/wiki/TrustSignal_Your_File_Integrity_Sidekick.pdf)



---



## Quickstart



### 1. Local Mode — Offline Verification



Generate a receipt for a build artifact, then verify against it later with no API call:



```yaml

name: Verify Artifact



on: workflow_dispatch



jobs:

  verify:

    runs-on: ubuntu-latest

    steps:

      - uses: actions/checkout@v4



      - name: Build release archive

        run: |

          mkdir -p build/package

          cp README.md build/package/README.md

          tar -czf build/trustsignal-demo-release.tgz -C build/package .



      - name: Create local receipt

        id: baseline

        uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.1

        with:

          mode: local

          path: build/trustsignal-demo-release.tgz



      - name: Verify against saved receipt

        uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.1

        with:

          mode: local

          path: build/trustsignal-demo-release.tgz

          receipt: ${{ steps.baseline.outputs.receipt_path }}

```



### 2. Managed Mode — TrustSignal API



Send the artifact hash and GitHub run metadata to TrustSignal for a signed verification receipt:



```yaml

- name: Verify with TrustSignal API

  id: trustsignal

  uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.1

  with:

    mode: managed

    path: build/trustsignal-demo-release.tgz

    api_base_url: https://api.trustsignal.dev

    api_key: ${{ secrets.TRUSTSIGNAL_API_KEY }}



- name: Show outputs

  run: |

    echo "SHA256: ${{ steps.trustsignal.outputs.sha256 }}"

    echo "Status: ${{ steps.trustsignal.outputs.verification_status }}"

    echo "Receipt: ${{ steps.trustsignal.outputs.receipt_id }}"

    echo "Verification: ${{ steps.trustsignal.outputs.verification_id }}"

```



---



## Authentication



### M2M (Recommended)



Private Key JWT — secure, keyless-style authentication:



```yaml

- uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.1

  with:

    mode: managed

    path: build/release.tgz

    api_base_url: https://api.trustsignal.dev

    client_id: ${{ secrets.TRUSTSIGNAL_CLIENT_ID }}

    private_key: ${{ secrets.TRUSTSIGNAL_PRIVATE_KEY }}

```



### API Key



Traditional API key for simple integrations:



```yaml

- uses: TrustSignal-dev/TrustSignal-Verify-Artifact@v0.2.1

  with:

    mode: managed

    path: build/release.tgz

    api_base_url: https://api.trustsignal.dev

    api_key: ${{ secrets.TRUSTSIGNAL_API_KEY }}

```



---



## Outputs



| Output | Description |

|---|---|

| `sha256` | SHA-256 hash of the artifact |

| `receipt_path` | Path to the saved receipt JSON |

| `verification_status` | Verification lifecycle status |

| `verification_id` | Managed verification identifier |

| `receipt_id` | Receipt identifier |

| `receipt_signature` | Receipt cryptographic signature |



---



## Why TrustSignal



| Feature | TrustSignal | GitHub Attestations | Sigstore / Cosign |

|---|---|---|---|

| Zero extra CLI dependencies | ✅ | ✅ | ❌ |

| Cross-platform receipt workflow | ✅ | ❌ | ✅ |

| Offline drift check from saved receipt | ✅ | ❌ | ❌ |

| Centralized verification service | ✅ | ❌ | ❌ |

| SLSA-focused provenance depth | Roadmap | Strong | Strong |

| Setup complexity | Low | Very low | Medium |



Best fit when you need to:

- Verify an artifact later without calling the API again using a saved receipt

- Carry a verification receipt between platforms (not locked to GitHub-native primitives)

- Add a centralized verification trail without a heavier client toolchain



---



## Local Drift Detection



The `receipt` input accepts:

- A local path to a receipt JSON file

- Inline receipt JSON containing an artifact hash

- A raw SHA-256 digest



If the current hash does not match, the action returns `verification_status=invalid` and fails when `fail_on_mismatch=true`.



---



## API Key Provisioning



The same key must exist in both places:



1. **GitHub:** Repository secret `TRUSTSIGNAL_API_KEY`

2. **TrustSignal backend:** `API_KEYS` and `API_KEY_SCOPES` environment variables



```

API_KEYS=your-live-key

API_KEY_SCOPES=your-live-key=verify|read

```



Rotate both simultaneously.



---



## Development



```bash

npm ci

npm run validate:local

```



`validate:local` uses the repository mock fetch harness for managed-mode tests and rebuilds `dist/index.js` to confirm the committed bundle matches source.



---



## CI & Live Validation



- **CI** — Runs on PRs and pushes to `main`

- **Live Managed Validation** — Runs against `https://api.trustsignal.dev` when `TRUSTSIGNAL_API_KEY` is configured (skipped on PRs and repos without the secret)

- **Nightly Live Test** — Builds and verifies a real `.tgz` archive against the production API



---



## Documentation



| Resource | Path |

|---|---|

| Plain-English Setup | [docs/plain-english-setup.md](docs/plain-english-setup.md) |

| How to Demo | [docs/how-to-demo-guide.md](docs/how-to-demo-guide.md) |

| Integration Guide | [docs/integration.md](docs/integration.md) |

| Live Test Notes | [docs/live-test.md](docs/live-test.md) |

| Troubleshooting | [docs/troubleshooting.md](docs/troubleshooting.md) |

| Changelog | [CHANGELOG.md](CHANGELOG.md) |



---



## License



MIT
