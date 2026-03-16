const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readOutputs(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return Object.fromEntries(
    raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function runAction({ artifactContents, failOnMismatch, receiptInput, receiptId, useMockApi = true }) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trustsignal-action-'));
  const artifactPath = path.join(tempDir, 'artifact.txt');
  const outputPath = path.join(tempDir, 'github-output.txt');
  fs.writeFileSync(artifactPath, artifactContents, 'utf8');

  const execArgs = useMockApi ? ['-r', './scripts/mock-fetch.js', 'dist/index.js'] : ['dist/index.js'];
  const result = spawnSync(process.execPath, execArgs, {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      INPUT_API_BASE_URL: 'https://api.trustsignal.dev',
      INPUT_API_KEY: 'test-key',
      INPUT_ARTIFACT_PATH: artifactPath,
      INPUT_RECEIPT: receiptInput || '',
      INPUT_SOURCE: 'local-test',
      INPUT_FAIL_ON_MISMATCH: String(failOnMismatch),
      GITHUB_OUTPUT: outputPath,
      GITHUB_RUN_ID: '12345',
      GITHUB_REPOSITORY: 'trustsignal-dev/trustsignal-verify-artifact',
      GITHUB_WORKFLOW: 'Artifact Verification',
      GITHUB_ACTOR: 'octocat',
      GITHUB_SHA: 'abc123def456',
      MOCK_RECEIPT_ID: receiptId
    },
    encoding: 'utf8'
  });

  const outputs = fs.existsSync(outputPath) ? readOutputs(outputPath) : {};
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    outputs
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const validApiRun = runAction({
    artifactContents: 'valid artifact',
    failOnMismatch: true,
    receiptId: '00000000-0000-4000-8000-000000000001'
  });

  const receiptHash = sha256('valid artifact');
  const receiptPayload = JSON.stringify({
    receipt_id: '00000000-0000-4000-8000-000000000010',
    receipt_signature: 'sig-00000000-0000-4000-8000-000000000010',
    artifact: { hash: receiptHash }
  });

  const validReceiptRun = runAction({
    artifactContents: 'valid artifact',
    failOnMismatch: true,
    receiptInput: receiptPayload,
    useMockApi: false
  });

  const driftReceiptRun = runAction({
    artifactContents: 'tampered artifact',
    failOnMismatch: false,
    receiptInput: receiptPayload,
    useMockApi: false
  });

  const driftReceiptFailRun = runAction({
    artifactContents: 'tampered artifact',
    failOnMismatch: true,
    receiptInput: receiptPayload,
    useMockApi: false
  });

  assert(validApiRun.status === 0, `Expected API valid run to succeed, got ${validApiRun.status}: ${validApiRun.stderr}`);
  assert(validApiRun.outputs.status === 'verified', 'Expected API run status=verified');
  assert(validApiRun.stdout.includes('✔ Artifact matches receipt. Integrity verified.'), 'Expected success message in API run stdout');

  assert(validReceiptRun.status === 0, `Expected receipt valid run to succeed, got ${validReceiptRun.status}: ${validReceiptRun.stderr}`);
  assert(validReceiptRun.outputs.verification_id === '00000000-0000-4000-8000-000000000010', 'Expected receipt id to map to verification_id');
  assert(validReceiptRun.outputs.status === 'verified', `Expected receipt valid status verified, got ${validReceiptRun.outputs.status}`);
  assert(validReceiptRun.stdout.includes('✔ Artifact matches receipt. Integrity verified.'), 'Expected success message in receipt run stdout');

  assert(driftReceiptRun.status === 0, `Expected drift run to continue when fail_on_mismatch=false, got ${driftReceiptRun.status}: ${driftReceiptRun.stderr}`);
  assert(driftReceiptRun.outputs.status === 'invalid', `Expected drift status invalid, got ${driftReceiptRun.outputs.status}`);
  assert(driftReceiptRun.stdout.includes('✖ Artifact drift detected. File no longer matches original receipt.'), 'Expected drift message in stdout');

  assert(driftReceiptFailRun.status !== 0, 'Expected drift run to fail when fail_on_mismatch=true');
  assert(driftReceiptFailRun.stderr.includes('Artifact drift detected. File no longer matches original receipt.'), 'Expected drift error message when failing');

  process.stdout.write('Local action contract test passed\n');
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
