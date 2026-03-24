const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readOutputs(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return {};

  return Object.fromEntries(
    raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function runAction({ inputs = {}, env = {}, useMockApi = false }) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trustsignal-test-'));
  const outputPath = path.join(tempDir, 'github-output.txt');
  const args = useMockApi ? ['-r', './scripts/mock-fetch.js', 'dist/index.js'] : ['dist/index.js'];

  const inputEnv = Object.fromEntries(
    Object.entries(inputs).map(([key, value]) => [`INPUT_${key.toUpperCase()}`, String(value)])
  );

  const result = spawnSync(process.execPath, args, {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      ...inputEnv,
      ...env,
      GITHUB_OUTPUT: outputPath,
      GITHUB_RUN_ID: '12345',
      GITHUB_RUN_NUMBER: '42',
      GITHUB_REPOSITORY: 'trustsignal-dev/trustsignal-verify-artifact',
      GITHUB_WORKFLOW: 'Artifact Verification',
      GITHUB_JOB: 'verify-artifact',
      GITHUB_ACTOR: 'octocat',
      GITHUB_SHA: 'abc123def456',
      GITHUB_REF: 'refs/heads/main',
      GITHUB_REF_NAME: 'main',
      GITHUB_EVENT_NAME: 'push'
    },
    encoding: 'utf8'
  });

  return {
    ...result,
    outputs: readOutputs(outputPath),
    tempDir
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trustsignal-artifact-'));
  const artifactPath = path.join(artifactDir, 'artifact.txt');
  fs.writeFileSync(artifactPath, 'release bundle v1\n', 'utf8');

  process.stdout.write('Running local mode receipt generation test...\n');
  const localGenerate = runAction({
    inputs: {
      mode: 'local',
      path: artifactPath,
      upload_receipt: 'false'
    }
  });
  assert(localGenerate.status === 0, `Local generation failed: ${localGenerate.stderr}`);
  assert(localGenerate.outputs.mode_used === 'local', 'Local generation mode mismatch');
  assert(localGenerate.outputs.verification_status === 'verified', 'Local generation status mismatch');
  assert(fs.existsSync(localGenerate.outputs.receipt_path), 'Local generation receipt was not created');

  process.stdout.write('Running local mode receipt verification test...\n');
  const localVerify = runAction({
    inputs: {
      mode: 'local',
      path: artifactPath,
      receipt: localGenerate.outputs.receipt_path,
      upload_receipt: 'false'
    }
  });
  assert(localVerify.status === 0, `Local verification failed: ${localVerify.stderr}`);
  assert(localVerify.outputs.verification_status === 'verified', 'Local verification status mismatch');
  assert(localVerify.stdout.includes('Artifact matches receipt'), 'Local verification success log missing');

  process.stdout.write('Running local mode drift detection test...\n');
  fs.appendFileSync(artifactPath, 'tampered\n', 'utf8');
  const localDrift = runAction({
    inputs: {
      mode: 'local',
      path: artifactPath,
      receipt: localGenerate.outputs.receipt_path,
      upload_receipt: 'false'
    }
  });
  assert(localDrift.status !== 0, 'Local drift detection should fail');
  assert(localDrift.stderr.includes('Artifact drift detected'), 'Local drift error message mismatch');

  process.stdout.write('Running inline receipt verification test...\n');
  const inlineArtifactPath = path.join(artifactDir, 'inline-artifact.txt');
  fs.writeFileSync(inlineArtifactPath, 'inline\n', 'utf8');
  const inlineVerify = runAction({
    inputs: {
      mode: 'local',
      path: inlineArtifactPath,
      receipt: JSON.stringify({
        receipt_id: 'receipt-inline',
        artifact: {
          hash: sha256('inline\n')
        }
      }),
      upload_receipt: 'false'
    }
  });
  assert(inlineVerify.status === 0, `Inline receipt verification failed: ${inlineVerify.stderr}`);
  assert(inlineVerify.outputs.receipt_id === 'receipt-inline', 'Inline receipt id mismatch');

  process.stdout.write('Running managed mode success test with mock fetch...\n');
  const managedArtifactPath = path.join(artifactDir, 'managed-artifact.txt');
  fs.writeFileSync(managedArtifactPath, 'managed\n', 'utf8');
  const managedSuccess = runAction({
    inputs: {
      mode: 'managed',
      path: managedArtifactPath,
      api_base_url: 'https://api.trustsignal.dev',
      api_key: 'test-key',
      upload_receipt: 'false'
    },
    env: {
      MOCK_STATUS: 'verified',
      MOCK_VALID: 'true',
      MOCK_RECEIPT_ID: '00000000-0000-4000-8000-000000000001'
    },
    useMockApi: true
  });
  assert(managedSuccess.status === 0, `Managed success run failed: ${managedSuccess.stderr}`);
  assert(managedSuccess.outputs.verification_status === 'verified', 'Managed success status mismatch');
  assert(managedSuccess.outputs.receipt_id === '00000000-0000-4000-8000-000000000001', 'Managed receipt id mismatch');

  process.stdout.write('Running managed mode soft-fail test with mock fetch...\n');
  const managedSoftFail = runAction({
    inputs: {
      mode: 'managed',
      path: managedArtifactPath,
      api_base_url: 'https://api.trustsignal.dev',
      api_key: 'test-key',
      fail_on_mismatch: 'false',
      upload_receipt: 'false'
    },
    env: {
      MOCK_STATUS: 'invalid',
      MOCK_VALID: 'false'
    },
    useMockApi: true
  });
  assert(managedSoftFail.status === 0, `Managed soft-fail run should not fail: ${managedSoftFail.stderr}`);
  assert(managedSoftFail.outputs.verification_status === 'invalid', 'Managed soft-fail status mismatch');

  process.stdout.write('Running managed mode hard-fail test with mock fetch...\n');
  const managedHardFail = runAction({
    inputs: {
      mode: 'managed',
      path: managedArtifactPath,
      api_base_url: 'https://api.trustsignal.dev',
      api_key: 'test-key',
      fail_on_mismatch: 'true',
      upload_receipt: 'false'
    },
    env: {
      MOCK_STATUS: 'invalid',
      MOCK_VALID: 'false'
    },
    useMockApi: true
  });
  assert(managedHardFail.status !== 0, 'Managed hard-fail run should fail');
  assert(managedHardFail.stderr.includes('TrustSignal verification was not valid'), 'Managed hard-fail error mismatch');

  process.stdout.write('Local validation tests passed\n');
}

main();
