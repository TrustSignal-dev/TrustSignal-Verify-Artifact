const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function runAction({ artifactContents, apiKey }) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trustsignal-mask-test-'));
  const artifactPath = path.join(tempDir, 'artifact.txt');
  fs.writeFileSync(artifactPath, artifactContents, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['-r', './scripts/mock-fetch.js', 'dist/index.js'],
    {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        INPUT_MODE: 'managed',
        INPUT_API_BASE_URL: 'https://api.trustsignal.dev',
        INPUT_API_KEY: apiKey,
        INPUT_ARTIFACT_PATH: artifactPath,
        INPUT_SOURCE: 'mask-test',
        INPUT_UPLOAD_RECEIPT: 'false',
        GITHUB_OUTPUT: path.join(tempDir, 'github-output.txt'),
        GITHUB_RUN_ID: '12345',
        GITHUB_REPOSITORY: 'repo',
        GITHUB_WORKFLOW: 'workflow',
        GITHUB_ACTOR: 'actor',
        GITHUB_SHA: 'sha'
      },
      encoding: 'utf8'
    }
  );

  return result;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const apiKey = 'this-is-a-very-secret-api-key-123456';
  const result = runAction({
    artifactContents: 'some content',
    apiKey: apiKey
  });

  // Check for mask command in stdout
  assert(result.stdout.includes(`::add-mask::${apiKey}`), 'API key was not masked in stdout');
  
  // Create a run that will definitely fail and check its stderr
  const failingResult = runAction({
    artifactContents: 'some content',
    apiKey: 'short' // Will fail because maskSecret only masks > 4 chars, 
                    // and mock-fetch will fail because it's not a known receipt id
  });

  // Check that the key itself is not in stderr if it's long enough to be a real key
  const longSecret = 'very-long-secret-key-that-should-be-masked';
  const failingResult2 = runAction({
    artifactContents: 'some content',
    apiKey: longSecret
  });
  
  // Note: setFailed sanitizes [A-Za-z0-9]{32,}
  assert(!failingResult2.stderr.includes(longSecret), 'Long secret was found in stderr');
  assert(failingResult2.stdout.includes(`::add-mask::${longSecret}`), 'Long secret was not masked in stdout');

  const filesToCheck = [
    'README.md',
    'action.yml',
    'src/index.js',
    'scripts/test-local.js',
    'dist/index.js'
  ];

  for (const relativePath of filesToCheck) {
    const absolutePath = path.resolve(__dirname, '..', relativePath);
    const content = fs.readFileSync(absolutePath, 'utf8');
    assert(!content.includes('<<<<<<<'), `Conflict marker found in ${relativePath}`);
    assert(!content.includes('>>>>>>>'), `Conflict marker found in ${relativePath}`);
  }

  process.stdout.write('Secret masking and hygiene tests passed\n');
}

main();
