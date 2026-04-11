const https = require('https');
const { normalizePhone } = require('./phone');

function to10DigitNumber(phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone || !/^\+91\d{10}$/.test(normalizedPhone)) {
    throw new Error('2Factor requires a valid Indian mobile number in +91 format.');
  }
  return normalizedPhone.slice(3);
}

function send2FactorOtp({ phone, otp }) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.TWOFACTOR_API_KEY;
    if (!apiKey) {
      return reject(new Error('TWOFACTOR_API_KEY is required in production to send OTPs.'));
    }

    const number = to10DigitNumber(phone);
    const templateName = process.env.TWOFACTOR_TEMPLATE_NAME || 'AUTOGEN';
    const path = `/API/V1/${encodeURIComponent(apiKey)}/SMS/${encodeURIComponent(number)}/${encodeURIComponent(String(otp))}/${encodeURIComponent(templateName)}`;

    const req = https.request(
      { hostname: '2factor.in', path, method: 'GET' },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => {
          let parsed = body;
          try { parsed = JSON.parse(body); } catch (_) {}

          if (response.statusCode < 200 || response.statusCode >= 300) {
            return reject(new Error(`2Factor error (${response.statusCode}): ${body.trim()}`));
          }

          if (parsed && typeof parsed === 'object' && parsed.Status === 'Error') {
            return reject(new Error(`2Factor error: ${parsed.Details || body.trim()}`));
          }

          resolve(parsed);
        });
      }
    );

    req.on('error', (error) => reject(error));
    req.end();
  });
}

async function sendProductionOtpSms({ phone, otp }) {
  return send2FactorOtp({ phone, otp });
}

async function sendOtpSms({ phone, otp, purpose, expiryMinutes }) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    return { mode: 'development' };
  }

  return sendProductionOtpSms({ phone, otp, purpose, expiryMinutes });
}

module.exports = {
  sendOtpSms,
};