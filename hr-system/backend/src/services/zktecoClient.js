// Thin wrapper around node-zklib for the ZKTeco K50A (fingerprint terminal,
// TCP/IP, standard SDK protocol on port 4370 - NOT the ADMS/cloud-push
// protocol). The device is enrolled with the same numeric ID as each
// employee's employeeCode so punches map back to the right Employee.
const ZKLib = require('node-zklib');

function buildClient() {
  const ip = process.env.ZKTECO_IP;
  const port = Number(process.env.ZKTECO_PORT || 4370);
  const timeout = Number(process.env.ZKTECO_TIMEOUT_MS || 10000);
  const inport = Number(process.env.ZKTECO_INPORT || 4000);

  if (!ip) {
    throw new Error('ZKTECO_IP is not configured');
  }

  return new ZKLib(ip, port, timeout, inport);
}

// Pulls every punch currently stored on the device. The device itself does
// not support "give me only new records", so de-duplication against
// already-imported punches happens in attendanceService via the unique
// (employeeCode, timestamp, deviceId) constraint on DevicePunch.
async function fetchPunches() {
  const zk = buildClient();
  try {
    await zk.createSocket();
    const result = await zk.getAttendances();
    const logs = (result && result.data) || [];

    return logs
      .map((log) => {
        const employeeCode = String(log.deviceUserId ?? log.userSn ?? log.uid ?? '').trim();
        const timestamp = log.recordTime instanceof Date ? log.recordTime : new Date(log.recordTime);
        if (!employeeCode || Number.isNaN(timestamp.getTime())) return null;
        return { employeeCode, timestamp, verifyMode: log.verifyMode ?? null, raw: log };
      })
      .filter(Boolean);
  } finally {
    try {
      await zk.disconnect();
    } catch (_) {
      // already disconnected / socket never opened - safe to ignore
    }
  }
}

async function pingDevice() {
  const zk = buildClient();
  try {
    await zk.createSocket();
    const info = await zk.getInfo().catch(() => null);
    return { online: true, info };
  } catch (err) {
    return { online: false, error: err.message };
  } finally {
    try {
      await zk.disconnect();
    } catch (_) {
      // ignore
    }
  }
}

module.exports = { fetchPunches, pingDevice };
