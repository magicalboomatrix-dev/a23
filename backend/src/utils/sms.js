const https = require('https');
const { normalizePhone } = require('./phone');

const FAST2SMS_API_URL = 'https://www.fast2sms.com/dev/bulkV2';
const DLT_ROUTE_ERROR_TEXT = 'route is blocked in your account, use dlt sms route';

function applyTemplate(template, values) {
  return String(template || '').replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    const value = values[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

function getSmsConfig() {
  const provider = String(process.env.SMS_PROVIDER || 'fast2sms').trim().toLowerCase();

  if (provider !== 'fast2sms') {
    throw new Error(`Unsupported SMS_PROVIDER "${provider}".`);
  }

  const authorizationKey = process.env.FAST2SMS_AUTHORIZATION_KEY;
  if (!authorizationKey) {
    throw new Error('FAST2SMS_AUTHORIZATION_KEY is required in production to send OTPs.');
  }

  return {
    authorizationKey,
    route: String(process.env.FAST2SMS_ROUTE || '').trim().toLowerCase(),
    language: process.env.FAST2SMS_LANGUAGE || 'english',
    senderId: process.env.FAST2SMS_SENDER_ID,
    entityId: process.env.FAST2SMS_ENTITY_ID,
    templateId: process.env.FAST2SMS_TEMPLATE_ID,
    messageTemplate: process.env.FAST2SMS_OTP_TEMPLATE || 'Your A23 OTP is {{otp}}. Valid for {{expiryMinutes}} minutes.',
  };
}

function hasDltConfig(config) {
  return Boolean(config.senderId && config.entityId && config.templateId);
}

function getFast2SmsRoute(config) {
  const configuredRoute = config.route;

  if (configuredRoute === 'dlt') {
    return 'dlt';
  }

  if (configuredRoute === 'otp') {
    return 'otp';
  }

  // Legacy q/default route is commonly blocked for OTP traffic. For this utility,
  // which only sends OTP messages, prefer DLT when fully configured, otherwise use q.
  if (!configuredRoute) {
    return hasDltConfig(config) ? 'dlt' : 'q';
  }

  if (configuredRoute === 'q') {
    return 'q';
  }

  return configuredRoute;
}

function validateDltConfig(config) {
  const missing = [];
  if (!config.senderId) missing.push('FAST2SMS_SENDER_ID');
  if (!config.entityId) missing.push('FAST2SMS_ENTITY_ID');
  if (!config.templateId) missing.push('FAST2SMS_TEMPLATE_ID');

  if (missing.length > 0) {
    throw new Error(`FAST2SMS DLT route requires ${missing.join(', ')}.`);
  }
}

function toFast2SmsNumber(phone) {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone || !/^\+91\d{10}$/.test(normalizedPhone)) {
    throw new Error('Fast2SMS requires a valid Indian mobile number in +91 format.');
  }

  return normalizedPhone.slice(3);
}

function formatFast2SmsError(responseBody, statusCode) {
  if (responseBody && typeof responseBody === 'object') {
    if (Array.isArray(responseBody.message) && responseBody.message.length > 0) {
      return `Fast2SMS error (${statusCode || 'unknown'}): ${responseBody.message.join(', ')}`;
    }

    if (typeof responseBody.message === 'string' && responseBody.message) {
      return `Fast2SMS error (${statusCode || 'unknown'}): ${responseBody.message}`;
    }

    if (typeof responseBody.error === 'string' && responseBody.error) {
      return `Fast2SMS error (${statusCode || 'unknown'}): ${responseBody.error}`;
    }
  }

  if (typeof responseBody === 'string' && responseBody.trim()) {
    return `Fast2SMS error (${statusCode || 'unknown'}): ${responseBody.trim()}`;
  }

  return `Fast2SMS request failed${statusCode ? ` with status ${statusCode}` : ''}.`;
}

function decorateFast2SmsError(error, route, config) {
  const rawMessage = String(error?.message || '');
  const normalizedMessage = rawMessage.toLowerCase();

  if (normalizedMessage.includes(DLT_ROUTE_ERROR_TEXT)) {
    if (route !== 'dlt' && !hasDltConfig(config)) {
      return new Error(`${rawMessage} Configure FAST2SMS_SENDER_ID, FAST2SMS_ENTITY_ID, FAST2SMS_TEMPLATE_ID and set FAST2SMS_ROUTE=dlt if your account only allows DLT SMS.`);
    }

    if (route !== 'dlt' && hasDltConfig(config)) {
      return new Error(`${rawMessage} Your account appears to require DLT SMS. Set FAST2SMS_ROUTE=dlt to force the DLT route.`);
    }
  }

  return error;
}

function sendFast2SmsRequest(payload, authorizationKey) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify(payload);
    const request = https.request(
      FAST2SMS_API_URL,
      {
        method: 'POST',
        headers: {
          authorization: authorizationKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      },
      (response) => {
        let responseBody = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => {
          let parsedBody = responseBody;
          try {
            parsedBody = JSON.parse(responseBody);
          } catch (error) {
            // Fast2SMS may return plain text errors for rejected requests.
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(formatFast2SmsError(parsedBody, response.statusCode)));
            return;
          }

          if (parsedBody && typeof parsedBody === 'object' && parsedBody.return === false) {
            reject(new Error(formatFast2SmsError(parsedBody, response.statusCode)));
            return;
          }

          resolve(parsedBody);
        });
      }
    );

    request.on('error', (error) => {
      reject(error);
    });

    request.write(requestBody);
    request.end();
  });
}

async function sendProductionOtpSms({ phone, otp, purpose, expiryMinutes }) {
  const config = getSmsConfig();
  const {
    authorizationKey,
    language,
    senderId,
    entityId,
    templateId,
    messageTemplate,
  } = config;
  const fast2SmsNumber = toFast2SmsNumber(phone);
  const route = getFast2SmsRoute(config);

  const message = applyTemplate(messageTemplate, { phone, otp, purpose, expiryMinutes });
  const payload = {
    route,
    flash: 0,
    numbers: fast2SmsNumber,
  };

  if (route === 'otp') {
    payload.variables_values = String(otp);
  } else {
    payload.language = language;
    payload.message = message;
  }

  if (route === 'dlt') {
    validateDltConfig(config);
  }

  if (senderId) {
    payload.sender_id = senderId;
  }

  if (entityId) {
    payload.entity_id = entityId;
  }

  if (templateId) {
    payload.template_id = templateId;
  }

  try {
    return await sendFast2SmsRequest(payload, authorizationKey);
  } catch (error) {
    throw decorateFast2SmsError(error, route, config);
  }
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