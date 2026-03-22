require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

function timeToMinutes(timeValue) {
  const [hours, minutes] = String(timeValue || '00:00:00').split(':').map(Number);
  return ((hours || 0) * 60) + (minutes || 0);
}

function formatLocalDate(dateValue) {
  const parsedDate = new Date(dateValue);
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed for ${url}`);
  }
  return data;
}

async function main() {
  const apiBase = process.env.SMOKE_API_BASE || `http://localhost:${process.env.PORT || 9000}/api`;
  const adminPhone = process.env.SMOKE_ADMIN_PHONE || '9999999999';
  const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || 'admin123';

  const login = await requestJson(`${apiBase}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: adminPhone, password: adminPassword }),
  });

  const headers = { Authorization: `Bearer ${login.token}` };
  const gamesPayload = await requestJson(`${apiBase}/games`, { headers });
  const livePayload = await requestJson(`${apiBase}/results/live`, { headers });
  const now = new Date();
  const currentMinutes = (now.getHours() * 60) + now.getMinutes();
  const today = formatLocalDate(now);

  const gameChecks = (gamesPayload.games || []).map((game) => {
    const hasTodayResult = game.result_date && formatLocalDate(game.result_date) === today;
    const expectedVisible = Boolean(hasTodayResult && timeToMinutes(game.result_time || game.close_time) <= currentMinutes);
    return {
      game: game.name,
      source: 'games',
      result_date: game.result_date,
      result_time: game.result_time || game.close_time,
      expected_visible: expectedVisible,
      actual_visible: Boolean(game.result_visible),
      pass: expectedVisible === Boolean(game.result_visible),
    };
  });

  const liveChecks = (livePayload.results || []).map((game) => {
    const hasTodayResult = game.result_date && formatLocalDate(game.result_date) === today;
    const expectedVisible = Boolean(hasTodayResult && timeToMinutes(game.result_time || game.close_time) <= currentMinutes);
    return {
      game: game.name,
      source: 'live',
      result_date: game.result_date,
      result_time: game.result_time || game.close_time,
      expected_visible: expectedVisible,
      actual_visible: Boolean(game.result_visible),
      pass: expectedVisible === Boolean(game.result_visible),
    };
  });

  const checks = [...gameChecks, ...liveChecks];
  const failures = checks.filter((entry) => !entry.pass);

  console.log(JSON.stringify({
    api_base: apiBase,
    total_checks: checks.length,
    failed_checks: failures.length,
    failures,
  }, null, 2));

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});