const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { DefaultArtifactClient } = require('@actions/artifact');

const FETCH_TIMEOUT_MS = 30000;

function getInput(name, options = {}) {
  const envName = `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
  const raw = process.env[envName];
  const value = typeof raw === 'string' ? raw.trim() : '';

  if (options.required && !value) {
    throw new Error(`Missing required input: ${name}`);
  }

  return value;
}

function getBooleanInput(name, defaultValue = false) {
  const value = getInput(name);
  if (!value) return defaultValue;

  const normalized = value.toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;

  throw new Error(`Invalid boolean input for ${name}: expected true or false`);
}

function setOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    process.stdout.write(`${name}=${String(value ?? '')}\n`);
    return;
  }

  fs.appendFileSync(outputPath, `${name}=${String(value ?? '')}\n`, 'utf8');
}

function sanitizeErrorMessage(message) {
  return String(message).replace(/[A-Za-z0-9_-]{24,}/g, '***');
}

function setFailed(message) {
  process.stderr.write(`::error::${sanitizeErrorMessage(message)}\n`);
  process.exitCode = 1;
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const fileBuffer = fs.readFileSync(filePath);
  hash.update(fileBuffer);
  return hash.digest('hex');
}

function getAllFiles(dirPath, files = []) {
  for (const file of fs.readdirSync(dirPath)) {
    const fullPath = path.join(dirPath, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      if (!['.git', 'node_modules', '.trustsignal'].includes(file)) {
        getAllFiles(fullPath, files);
      }
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function hashPath(targetPath) {
  const absolutePath = path.resolve(targetPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Path not found: ${absolutePath}`);
  }

  const stats = fs.statSync(absolutePath);
  if (stats.isFile()) {
    return sha256File(absolutePath);
  }

  if (stats.isDirectory()) {
    const files = getAllFiles(absolutePath).sort();
    const hash = crypto.createHash('sha256');

    for (const file of files) {
      const relativePath = path.relative(absolutePath, file);
      const fileHash = sha256File(file);
      hash.update(`${relativePath}:${fileHash}\n`);
    }

    return hash.digest('hex');
  }

  throw new Error(`Unsupported path type: ${absolutePath}`);
}

function validateHash(value) {
  const normalized = value.toLowerCase().replace(/^sha256:/, '');
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error('artifact_hash must be a valid SHA-256 hex digest');
  }
  return normalized;
}

function normalizeBaseUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error('api_base_url must be a valid URL');
  }

  if (url.protocol !== 'https:') {
    throw new Error('api_base_url must use https');
  }

  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function getGitHubContext() {
  return {
    repository: process.env.GITHUB_REPOSITORY || undefined,
    runId: process.env.GITHUB_RUN_ID || undefined,
    runNumber: process.env.GITHUB_RUN_NUMBER || undefined,
    workflow: process.env.GITHUB_WORKFLOW || undefined,
    job: process.env.GITHUB_JOB || undefined,
    actor: process.env.GITHUB_ACTOR || undefined,
    sha: process.env.GITHUB_SHA || undefined,
    ref: process.env.GITHUB_REF || undefined,
    refName: process.env.GITHUB_REF_NAME || undefined,
    eventName: process.env.GITHUB_EVENT_NAME || undefined
  };
}

function omitUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

function buildVerificationRequest({ artifactHash, artifactPath, source }) {
  const github = getGitHubContext();
  const provider = source.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 64) || 'github-actions';

  return {
    artifact: {
      hash: artifactHash,
      algorithm: 'sha256'
    },
    source: omitUndefined({
      provider,
      repository: github.repository,
      workflow: github.workflow,
      runId: github.runId,
      runNumber: github.runNumber,
      job: github.job,
      actor: github.actor,
      commit: github.sha,
      ref: github.ref,
      refName: github.refName,
      eventName: github.eventName
    }),
    metadata: artifactPath ? { artifactPath } : {}
  };
}

async function callHealthApi(apiBaseUrl) {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function parseJsonResponse(response) {
  const rawBody = await response.text();
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error(`TrustSignal API returned a non-JSON response with status ${response.status}`);
  }
}

function buildApiErrorMessage(status, responseBody) {
  const message = responseBody.error || responseBody.message || '';
  const suffix = message ? `: ${message}` : '';

  if (status === 403 && /invalid api key/i.test(message)) {
    return (
      `TrustSignal API request failed with status ${status}${suffix}. ` +
      'Confirm the GitHub secret value is also present in the API backend `API_KEYS` allowlist ' +
      'and granted at least `verify|read` in `API_KEY_SCOPES`, then redeploy the API service.'
    );
  }

  return `TrustSignal API request failed with status ${status}${suffix}`;
}

async function getM2MToken({ apiBaseUrl, clientId, privateKey }) {
  const endpoint = `${apiBaseUrl}/api/v1/token`;
  const now = Math.floor(Date.now() / 1000);
  
  const assertion = jwt.sign({
    iss: clientId,
    sub: clientId,
    aud: endpoint,
    iat: now,
    exp: now + 300,
    jti: crypto.randomBytes(16).toString('hex')
  }, privateKey, { algorithm: 'RS256' });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:private-key-jwt',
      client_assertion: assertion
    })
  });

  const body = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(`Failed to obtain M2M token: ${body.error || response.statusText}`);
  }

  return body.access_token;
}

async function callVerificationApi({ apiBaseUrl, apiKey, clientId, privateKey, artifactHash, artifactPath, source }) {
  const endpoint = `${apiBaseUrl}/api/v1/verify`;
  const payload = buildVerificationRequest({ artifactHash, artifactPath, source });

  let authHeader;
  if (privateKey && clientId) {
    const token = await getM2MToken({ apiBaseUrl, clientId, privateKey });
    authHeader = `Bearer ${token}`;
  } else {
    authHeader = `Key ${apiKey}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'authorization': authHeader
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error(`TrustSignal API request timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const responseBody = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(buildApiErrorMessage(response.status, responseBody));
  }

  return responseBody;
}

function deriveStatus(responseBody) {
  if (typeof responseBody.status === 'string' && responseBody.status.trim()) {
    return responseBody.status.trim();
  }

  if (typeof responseBody.verificationStatus === 'string' && responseBody.verificationStatus.trim()) {
    return responseBody.verificationStatus.trim();
  }

  if (responseBody.valid === true || responseBody.verified === true || responseBody.match === true) {
    return 'verified';
  }

  if (responseBody.valid === false || responseBody.verified === false || responseBody.match === false) {
    return 'invalid';
  }

  return 'unknown';
}

function isVerificationValid(responseBody, status) {
  if ([responseBody.valid, responseBody.verified, responseBody.match].includes(true)) {
    return true;
  }

  if ([responseBody.valid, responseBody.verified, responseBody.match].includes(false)) {
    return false;
  }

  const normalizedStatus = String(status || '').toLowerCase();
  if (['verified', 'valid', 'match', 'matched', 'success', 'ok'].includes(normalizedStatus)) {
    return true;
  }

  if (['invalid', 'mismatch', 'failed', 'error', 'tampered'].includes(normalizedStatus)) {
    return false;
  }

  return false;
}

function extractReceiptSignature(responseBody) {
  if (typeof responseBody.receipt_signature === 'string') {
    return responseBody.receipt_signature;
  }

  if (typeof responseBody.receiptSignature === 'string') {
    return responseBody.receiptSignature;
  }

  if (responseBody.receiptSignature && typeof responseBody.receiptSignature.signature === 'string') {
    return responseBody.receiptSignature.signature;
  }

  return '';
}

function parseReceiptMetadata(receiptPayload) {
  return {
    receiptId: receiptPayload?.receipt_id || receiptPayload?.receiptId || receiptPayload?.id || '',
    receiptSignature:
      receiptPayload?.receipt_signature ||
      receiptPayload?.receiptSignature?.signature ||
      receiptPayload?.receiptSignature ||
      ''
  };
}

function extractReceiptArtifactHash(receiptPayload) {
  const candidates = [
    receiptPayload?.artifact_hash,
    receiptPayload?.artifactHash,
    receiptPayload?.artifact?.hash,
    receiptPayload?.artifact?.sha256,
    receiptPayload?.sha256,
    receiptPayload?.fingerprint,
    receiptPayload?.hash
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return validateHash(candidate.trim());
    }
  }

  throw new Error('receipt did not include an artifact hash');
}

function loadReceiptInput(receiptInput) {
  const trimmed = receiptInput.trim();
  if (!trimmed) {
    throw new Error('receipt input was empty');
  }

  const possiblePath = path.resolve(trimmed);
  if (fs.existsSync(possiblePath)) {
    const raw = fs.readFileSync(possiblePath, 'utf8');
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Receipt file is not valid JSON: ${possiblePath}`);
    }

    return {
      absolutePath: possiblePath,
      receipt: parsed,
      artifactHash: extractReceiptArtifactHash(parsed)
    };
  }

  if (/^[a-f0-9]{64}$/i.test(trimmed) || /^sha256:[a-f0-9]{64}$/i.test(trimmed)) {
    return {
      absolutePath: '',
      receipt: { artifactHash: validateHash(trimmed) },
      artifactHash: validateHash(trimmed)
    };
  }

  try {
    const parsed = JSON.parse(trimmed);
    return {
      absolutePath: '',
      receipt: parsed,
      artifactHash: extractReceiptArtifactHash(parsed)
    };
  } catch (error) {
    throw new Error(`Invalid receipt input: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function maskSecret(secret) {
  if (secret && secret.length > 4) {
    process.stdout.write(`::add-mask::${secret}\n`);
  }
}

async function uploadReceiptArtifact(receiptPath) {
  try {
    if (!process.env.ACTIONS_RUNTIME_TOKEN && !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
      process.stdout.write('Not in GitHub Actions environment, skipping receipt upload.\n');
      return;
    }

    const artifactClient = new DefaultArtifactClient();
    const artifactName = `trustsignal-receipt-${Date.now()}`;
    await artifactClient.uploadArtifact(
      artifactName,
      [receiptPath],
      path.dirname(receiptPath)
    );
    process.stdout.write(`Successfully uploaded TrustSignal receipt as artifact: ${artifactName}\n`);
  } catch (error) {
    process.stdout.write(`Warning: Failed to upload receipt artifact: ${error.message}\n`);
  }
}

function createReceiptEnvelope({ mode, artifactHash, artifactPath, source, details }) {
  const github = getGitHubContext();

  return {
    version: '1.0',
    mode,
    artifactHash,
    artifact: {
      algorithm: 'sha256',
      hash: artifactHash
    },
    metadata: {
      ...(artifactPath ? { artifactPath } : {}),
      source
    },
    source: omitUndefined({
      provider: 'github-actions',
      repository: github.repository,
      workflow: github.workflow,
      runId: github.runId,
      runNumber: github.runNumber,
      job: github.job,
      actor: github.actor,
      commit: github.sha,
      ref: github.ref,
      refName: github.refName,
      eventName: github.eventName
    }),
    timestamp: new Date().toISOString(),
    ...(details ? { details } : {})
  };
}

async function run() {
  try {
    const mode = (getInput('mode') || 'local').toLowerCase();
    if (!['local', 'managed'].includes(mode)) {
      throw new Error(`Unsupported mode: ${mode}`);
    }

    const artifactPathInput = getInput('path') || getInput('artifact_path') || '.';
    const providedArtifactHash = getInput('artifact_hash');
    const receiptInput = getInput('receipt');
    const source = getInput('source') || 'github-actions';
    const uploadReceipt = getBooleanInput('upload_receipt', true);
    const failOnMismatch = getBooleanInput('fail_on_mismatch', true);

    process.stdout.write(`TrustSignal mode: ${mode}\n`);

    const artifactHash = providedArtifactHash ? validateHash(providedArtifactHash) : hashPath(artifactPathInput);
    process.stdout.write(`Artifact SHA-256: ${artifactHash}\n`);
    setOutput('sha256', artifactHash);

    if (mode === 'local' && receiptInput) {
      const loadedReceipt = loadReceiptInput(receiptInput);
      const { receiptId, receiptSignature } = parseReceiptMetadata(loadedReceipt.receipt);
      const matches = artifactHash === loadedReceipt.artifactHash;
      const verificationStatus = matches ? 'verified' : 'invalid';

      if (loadedReceipt.absolutePath) {
        process.stdout.write(`Loaded receipt: ${loadedReceipt.absolutePath}\n`);
      }
      process.stdout.write(`Receipt expects SHA-256: ${loadedReceipt.artifactHash}\n`);

      setOutput('receipt_path', loadedReceipt.absolutePath);
      setOutput('mode_used', mode);
      setOutput('receipt_id', receiptId);
      setOutput('receipt_signature', receiptSignature);
      setOutput('verification_status', verificationStatus);
      setOutput('verification_id', receiptId || 'local-receipt-check');
      setOutput('status', verificationStatus);

      if (matches) {
        process.stdout.write('Artifact matches receipt. Integrity verified.\n');
      } else {
        process.stdout.write('Artifact drift detected. File no longer matches original receipt.\n');
        if (failOnMismatch) {
          throw new Error('Artifact drift detected: artifact does not match receipt');
        }
      }

      return;
    }

    const receiptDir = path.resolve('.trustsignal');
    fs.mkdirSync(receiptDir, { recursive: true });
    const receiptPath = path.join(receiptDir, 'receipt.json');

    let receiptId = '';
    let receiptSignature = '';
    let verificationId = '';
    let verificationStatus = 'verified';
    let receiptData;

    if (mode === 'managed') {
      const apiBaseUrl = normalizeBaseUrl(getInput('api_base_url', { required: true }));
      const apiKey = getInput('api_key');
      const clientId = getInput('client_id');
      const privateKey = getInput('private_key');

      if (!apiKey && (!clientId || !privateKey)) {
        throw new Error('Managed mode requires either api_key or both client_id and private_key');
      }

      if (apiKey) maskSecret(apiKey);
      if (privateKey) maskSecret(privateKey);

      process.stdout.write(`Checking TrustSignal API health: ${apiBaseUrl}\n`);
      const healthy = await callHealthApi(apiBaseUrl);
      if (!healthy) {
        throw new Error(`TrustSignal API health check failed at ${apiBaseUrl}`);
      }

      process.stdout.write('Calling TrustSignal verification API...\n');
      const responseBody = await callVerificationApi({
        apiBaseUrl,
        apiKey,
        clientId,
        privateKey,
        artifactHash,
        artifactPath: providedArtifactHash ? '' : artifactPathInput,
        source
      });

      verificationStatus = deriveStatus(responseBody);
      const valid = isVerificationValid(responseBody, verificationStatus);
      receiptId = responseBody.receipt_id || responseBody.receiptId || responseBody.id || '';
      verificationId = responseBody.verification_id || responseBody.verificationId || receiptId;
      receiptSignature = extractReceiptSignature(responseBody);

      receiptData = createReceiptEnvelope({
        mode,
        artifactHash,
        artifactPath: providedArtifactHash ? '' : artifactPathInput,
        source,
        details: responseBody
      });

      if (!valid && failOnMismatch) {
        fs.writeFileSync(receiptPath, JSON.stringify(receiptData, null, 2), 'utf8');
        setOutput('receipt_path', receiptPath);
        throw new Error(`TrustSignal verification was not valid. Status: ${verificationStatus}`);
      }
    } else {
      receiptData = createReceiptEnvelope({
        mode,
        artifactHash,
        artifactPath: providedArtifactHash ? '' : artifactPathInput,
        source
      });
      process.stdout.write('TrustSignal local receipt created\n');
    }

    fs.writeFileSync(receiptPath, JSON.stringify(receiptData, null, 2), 'utf8');

    setOutput('receipt_path', receiptPath);
    setOutput('mode_used', mode);
    setOutput('receipt_id', receiptId);
    setOutput('receipt_signature', receiptSignature);
    setOutput('verification_status', verificationStatus);
    setOutput('verification_id', verificationId);
    setOutput('status', verificationStatus);

    process.stdout.write(`Receipt saved to ${receiptPath}\n`);

    if (uploadReceipt) {
      await uploadReceiptArtifact(receiptPath);
    }

    if (verificationStatus === 'verified') {
      process.stdout.write('Artifact matches receipt. Integrity verified.\n');
    } else {
      process.stdout.write(`Verification completed with status: ${verificationStatus}\n`);
    }
  } catch (error) {
    setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
