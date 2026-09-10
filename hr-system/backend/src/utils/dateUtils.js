// The office runs in a single timezone (the local server's own clock), so
// "date" throughout attendance/leave/payroll means that server-local
// calendar day, stored as a UTC midnight DATE value.
function toDateOnly(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function todayDateOnly() {
  return toDateOnly(new Date());
}

function addDays(dateOnly, days) {
  const d = new Date(dateOnly);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function isSameDate(a, b) {
  return toDateOnly(a).getTime() === toDateOnly(b).getTime();
}

function dayOfWeek(dateOnly) {
  return new Date(dateOnly).getUTCDay(); // 0=Sunday..6=Saturday
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function timeStringToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

module.exports = { toDateOnly, todayDateOnly, addDays, isSameDate, dayOfWeek, daysInMonth, timeStringToMinutes };
