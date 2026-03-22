function normalizePhone(rawPhone) {
  const sanitized = String(rawPhone || '').trim().replace(/[\s()-]/g, '');

  if (!/^\+[1-9]\d{7,14}$/.test(sanitized)) {
    return null;
  }

  return sanitized;
}

module.exports = {
  normalizePhone,
};