const prisma = require('../lib/prisma');

const SETTINGS_ID = 'SETTINGS';

// Settings are read from the DB on every call (no in-process cache) so an
// HR/Admin edit takes effect immediately for attendance/OT/payroll runs
// that happen right after, without needing a server restart.
async function getSettings() {
  const settings = await prisma.systemSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (settings) return settings;
  return prisma.systemSettings.create({ data: { id: SETTINGS_ID } });
}

async function updateSettings(data) {
  await getSettings(); // ensure the row exists
  return prisma.systemSettings.update({ where: { id: SETTINGS_ID }, data });
}

module.exports = { getSettings, updateSettings, SETTINGS_ID };
