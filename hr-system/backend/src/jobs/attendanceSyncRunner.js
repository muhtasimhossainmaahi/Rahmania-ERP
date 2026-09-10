// One-off manual sync, useful for testing against the device (or re-pulling
// after it was offline) without running the full API server:
//   npm run sync:attendance
require('dotenv').config();
const { syncFromDevice } = require('../services/attendanceService');

syncFromDevice()
  .then((result) => {
    console.log(`Imported ${result.imported} punch(es), updated ${result.employeesUpdated} attendance record(s).`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Sync failed:', err);
    process.exit(1);
  });
