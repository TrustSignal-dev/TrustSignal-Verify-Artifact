const crypto = require('node:crypto');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(body);
    }
  };
}

global.fetch = async function mockFetch(url, options = {}) {
  const parsedUrl = new URL(url);
  const apiKey = options.headers && (options.headers['x-api-key'] || options.headers['X-API-Key']);
  const healthStatus = Number(process.env.MOCK_HEALTH_STATUS || '200');
  
  if (parsedUrl.pathname === '/api/v1/health') {
    return jsonResponse(healthStatus, { status: healthStatus >= 200 && healthStatus < 300 ? 'ok' : 'down' });
  }

  if (apiKey !== 'test-key' && !apiKey?.startsWith('secret-')) {
    return jsonResponse(403, { error: 'Forbidden: invalid API key' });
  }

  if (parsedUrl.pathname === '/api/v1/verify' && options.method === 'POST') {
    const payload = JSON.parse(options.body || '{}');
    const receiptId = process.env.MOCK_RECEIPT_ID || '00000000-0000-4000-8000-000000000001';
    const verificationId = process.env.MOCK_VERIFICATION_ID || `verify-${receiptId}`;
    const responseStatus = Number(process.env.MOCK_VERIFY_HTTP_STATUS || '200');
    
    const defaultValid = !!(payload?.artifact?.hash && payload?.source?.repository);
    const isValid = process.env.MOCK_VALID ? process.env.MOCK_VALID === 'true' : defaultValid;
    const status = process.env.MOCK_STATUS || (isValid ? 'verified' : 'invalid');

    return jsonResponse(responseStatus, {
      verification_id: verificationId,
      status,
      receipt_id: receiptId,
      receipt_signature: `sig-${receiptId}`,
      valid: isValid
    });
  }

  return jsonResponse(404, { error: 'not_found' });
};
