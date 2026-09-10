const cron = require('node-cron');
const { syncFromDevice, finalizeDay } = require('../services/attendanceService');
const { getSettings } = require('../services/settingsService');
const { todayDateOnly } = require('../utils/dateUtils');

let timer = null;

async function tick() {
  try {
    const result = await syncFromDevice();
    if (result.imported > 0) {
      console.log(`[attendance-sync] imported ${result.imported} punch(es), updated ${result.employeesUpdated} record(s)`);
    }
  } catch (err) {
    console.error('[attendance-sync] failed:', err.message);
  }

  const settings = await getSettings().catch(() => ({ attendanceSyncIntervalMinutes: 5 }));
  const delayMs = Math.max(1, settings.attendanceSyncIntervalMinutes) * 60 * 1000;
  timer = setTimeout(tick, delayMs);
}

// Starts the self-rescheduling ZKTeco poller (interval re-read from
// System Settings on every cycle, so an HR/Admin edit takes effect on the
// next tick without a server restart) plus a fixed end-of-day job that
// marks employees ABSENT if they never punched at all.
function startAttendanceSyncJob() {
  if (!process.env.ZKTECO_IP) {
    console.warn('[attendance-sync] ZKTECO_IP not set - device polling disabled');
    return;
  }
  if (timer) return;
  tick();

  cron.schedule('55 23 * * *', async () => {
    try {
      const result = await finalizeDay(todayDateOnly());
      console.log(`[attendance-finalize] finalized ${result.updated} record(s) for today`);
    } catch (err) {
      console.error('[attendance-finalize] failed:', err.message);
    }
  });
}

function stopAttendanceSyncJob() {
  if (timer) clearTimeout(timer);
  timer = null;
}

module.exports = { startAttendanceSyncJob, stopAttendanceSyncJob };
