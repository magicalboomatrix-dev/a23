require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const apiBase = process.env.SMOKE_API_BASE || `http://localhost:${process.env.PORT || 9000}/api`;
const adminPhone = process.env.SMOKE_ADMIN_PHONE || '9999999999';
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || 'admin123';
const moderatorPhone = process.env.SMOKE_MODERATOR_PHONE || '8888888888';
const moderatorPassword = process.env.SMOKE_MODERATOR_PASSWORD || 'mod123';
const seededPhones = ['7777777771', '7777777772', '7777777773', '7777777774', '7777777775', '7777777776', '7777777777', '7777777778'];

async function callApi({ method = 'GET', path, token, body }) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

function bucketResult(results, actor, endpoint, res) {
  results.push({
    actor,
    endpoint,
    ok: res.ok,
    status: res.status,
    error: res.ok ? null : (res.data?.error || 'Request failed'),
  });
}

async function loginAdmin() {
  const loginRes = await callApi({
    method: 'POST',
    path: '/auth/admin-login',
    body: { phone: adminPhone, password: adminPassword },
  });
  if (!loginRes.ok || !loginRes.data?.token) {
    throw new Error(`Admin login failed: ${loginRes.data?.error || loginRes.status}`);
  }
  return loginRes.data.token;
}

async function loginModerator() {
  const loginRes = await callApi({
    method: 'POST',
    path: '/auth/admin-login',
    body: { phone: moderatorPhone, password: moderatorPassword },
  });
  if (!loginRes.ok || !loginRes.data?.token) {
    throw new Error(`Moderator login failed: ${loginRes.data?.error || loginRes.status}`);
  }
  return loginRes.data.token;
}

async function prepareAndLoginUser(phone, index) {
  const check = await callApi({ method: 'POST', path: '/auth/check-user', body: { phone } });
  if (!check.ok || !check.data?.exists) {
    return { phone, token: null, error: check.data?.error || 'User not found', stage: 'check-user' };
  }

  const sendOtp = await callApi({
    method: 'POST',
    path: '/auth/send-otp',
    body: { phone, purpose: 'reset_mpin' },
  });
  if (!sendOtp.ok || !sendOtp.data?.otp) {
    return { phone, token: null, error: sendOtp.data?.error || 'OTP send failed', stage: 'send-otp' };
  }

  const verify = await callApi({
    method: 'POST',
    path: '/auth/verify-otp',
    body: { phone, otp: sendOtp.data.otp, purpose: 'reset_mpin' },
  });
  if (!verify.ok || !verify.data?.tempToken) {
    return { phone, token: null, error: verify.data?.error || 'OTP verify failed', stage: 'verify-otp' };
  }

  const mpin = String(1000 + index);
  const reset = await callApi({
    method: 'POST',
    path: '/auth/reset-mpin',
    token: verify.data.tempToken,
    body: { mpin },
  });
  if (!reset.ok) {
    return { phone, token: null, error: reset.data?.error || 'MPIN reset failed', stage: 'reset-mpin' };
  }

  const login = await callApi({
    method: 'POST',
    path: '/auth/login-mpin',
    body: { phone, mpin },
  });
  if (!login.ok || !login.data?.token) {
    return { phone, token: null, error: login.data?.error || 'MPIN login failed', stage: 'login-mpin' };
  }

  return { phone, token: login.data.token, user: login.data.user, error: null };
}

async function runUserChecks(userToken, phone, results) {
  const userEndpoints = [
    ['/users/profile', 'GET'],
    ['/users/bank-accounts', 'GET'],
    ['/users/account-statement', 'GET'],
    ['/users/profit-loss', 'GET'],
    ['/users/ui-config', 'GET'],
    ['/wallet/info', 'GET'],
    ['/bets/my-bets?page=1&limit=10', 'GET'],
    ['/bets/history?page=1&limit=10', 'GET'],
    ['/deposits/history?page=1&limit=10', 'GET'],
    ['/withdraw/history?page=1&limit=10', 'GET'],
    ['/bonus/history', 'GET'],
    ['/bonus/referrals', 'GET'],
    ['/notifications/my?page=1&limit=10', 'GET'],
    ['/results/live', 'GET'],
    ['/results/monthly', 'GET'],
    ['/results/yearly', 'GET'],
    ['/games', 'GET'],
    ['/deposits/scanner', 'GET'],
    ['/bets/recent-winners?limit=5', 'GET'],
  ];

  await Promise.all(userEndpoints.map(async ([path, method]) => {
    const res = await callApi({ method, path, token: userToken });
    bucketResult(results, `user:${phone}`, `${method} ${path}`, res);
  }));
}

async function runRoleChecks(adminToken, moderatorToken, results) {
  const adminEndpoints = [
    ['/admin/users?page=1&limit=20', 'GET'],
    ['/admin/settings', 'GET'],
    ['/admin/flagged-accounts', 'GET'],
    ['/admin/moderator-stats', 'GET'],
    ['/admin/moderator-floats', 'GET'],
    ['/admin/fraud-logs?page=1&limit=10', 'GET'],
    ['/admin/fraud-alerts', 'GET'],
    ['/admin/dashboard-stats', 'GET'],
    ['/analytics/dashboard', 'GET'],
    ['/analytics/bets?range=7d', 'GET'],
    ['/analytics/revenue?range=7d', 'GET'],
    ['/deposits/all?page=1&limit=20', 'GET'],
    ['/withdraw/all?page=1&limit=20', 'GET'],
    ['/results/admin/monthly', 'GET'],
    ['/results/admin/yearly', 'GET'],
    ['/results/history?page=1&limit=10', 'GET'],
  ];

  const moderatorEndpoints = [
    ['/moderator/scanner', 'GET'],
    ['/analytics/dashboard', 'GET'],
    ['/analytics/bets?range=7d', 'GET'],
    ['/deposits/all?page=1&limit=20', 'GET'],
    ['/withdraw/all?page=1&limit=20', 'GET'],
    ['/notifications/my?page=1&limit=10', 'GET'],
  ];

  await Promise.all([
    ...adminEndpoints.map(async ([path, method]) => {
      const res = await callApi({ method, path, token: adminToken });
      bucketResult(results, 'admin', `${method} ${path}`, res);
    }),
    ...moderatorEndpoints.map(async ([path, method]) => {
      const res = await callApi({ method, path, token: moderatorToken });
      bucketResult(results, 'moderator', `${method} ${path}`, res);
    }),
  ]);
}

function summarize(results, userPrep) {
  const total = results.length;
  const failed = results.filter((r) => !r.ok);

  const byEndpoint = {};
  for (const row of failed) {
    const key = row.endpoint;
    if (!byEndpoint[key]) {
      byEndpoint[key] = { count: 0, samples: [] };
    }
    byEndpoint[key].count += 1;
    if (byEndpoint[key].samples.length < 3) {
      byEndpoint[key].samples.push({ actor: row.actor, status: row.status, error: row.error });
    }
  }

  const prepFailures = userPrep.filter((u) => u.error);

  return {
    api_base: apiBase,
    seeded_users_total: seededPhones.length,
    user_login_success: userPrep.filter((u) => u.token).length,
    user_login_failed: prepFailures.length,
    user_login_failures: prepFailures,
    total_requests: total,
    passed_requests: total - failed.length,
    failed_requests: failed.length,
    failed_by_endpoint: byEndpoint,
  };
}

async function main() {
  const started = Date.now();
  const results = [];

  const [adminToken, moderatorToken] = await Promise.all([loginAdmin(), loginModerator()]);

  const userPrep = await Promise.all(
    seededPhones.map((phone, idx) => prepareAndLoginUser(phone, idx + 1))
  );

  await Promise.all([
    runRoleChecks(adminToken, moderatorToken, results),
    ...userPrep
      .filter((u) => u.token)
      .map((u) => runUserChecks(u.token, u.phone, results)),
  ]);

  const summary = summarize(results, userPrep);
  summary.duration_ms = Date.now() - started;

  console.log(JSON.stringify(summary, null, 2));

  if (summary.failed_requests > 0 || summary.user_login_failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
