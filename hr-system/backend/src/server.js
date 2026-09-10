const app = require('./app');
const { startAttendanceSyncJob } = require('./jobs/attendanceSyncJob');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Rahmania HR API listening on port ${PORT}`);
  startAttendanceSyncJob();
});
