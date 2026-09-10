import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Tabs, Table, Badge, Select, Input, Button, ErrorText, extractErrorMessage, STATUS_COLORS } from '../components/ui';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function MonthPicker({ month, year, onChange }) {
  return (
    <div className="flex gap-2 items-end mb-4">
      <Select label="Month" value={month} onChange={(e) => onChange(Number(e.target.value), year)}>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </Select>
      <Select label="Year" value={year} onChange={(e) => onChange(month, Number(e.target.value))}>
        {[year - 1, year, year + 1].map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
}

export default function Attendance() {
  const { user } = useAuth();
  const canSeeTeam = ['MANAGER', 'HR_ADMIN', 'MANAGEMENT'].includes(user.role);
  const isHr = user.role === 'HR_ADMIN';

  const tabs = [
    ...(user.employee ? [{ key: 'my', label: 'My Attendance' }] : []),
    ...(canSeeTeam ? [{ key: 'team', label: 'Team / Office' }] : []),
    ...(isHr ? [{ key: 'correction', label: 'Manual Correction & Sync' }] : []),
  ];
  const [tab, setTab] = useState(tabs[0]?.key);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Attendance</h1>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'my' && <MyAttendance />}
      {tab === 'team' && <TeamAttendance />}
      {tab === 'correction' && <ManualCorrection />}
    </div>
  );
}

function MyAttendance() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [days, setDays] = useState([]);

  useEffect(() => {
    api.get('/attendance/me', { params: { month, year } }).then((res) => setDays(res.data));
  }, [month, year]);

  return (
    <Card>
      <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
      <Table
        columns={[
          { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
          { key: 'checkIn', header: 'Check In', render: (r) => (r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '-') },
          { key: 'checkOut', header: 'Check Out', render: (r) => (r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '-') },
          { key: 'status', header: 'Status', render: (r) => <Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge> },
          { key: 'note', header: 'Note', render: (r) => r.note || '-' },
        ]}
        rows={days}
      />
    </Card>
  );
}

function TeamAttendance() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [sheet, setSheet] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (['HR_ADMIN', 'MANAGEMENT'].includes(user.role)) {
      api.get('/departments').then((res) => setDepartments(res.data));
    }
  }, [user.role]);

  useEffect(() => {
    setLoading(true);
    api
      .get('/attendance/monthly-sheet', { params: { month, year, departmentId: departmentId || undefined } })
      .then((res) => setSheet(res.data))
      .finally(() => setLoading(false));
  }, [month, year, departmentId]);

  const rows = useMemo(
    () =>
      sheet.map((s) => {
        const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, HALF_DAY: 0, LEAVE: 0 };
        s.days.forEach((d) => {
          if (counts[d.status] !== undefined) counts[d.status] += 1;
        });
        return { id: s.employee.id, employee: s.employee, ...counts };
      }),
    [sheet],
  );

  return (
    <Card>
      <div className="flex flex-wrap gap-3 items-end mb-2">
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
        {['HR_ADMIN', 'MANAGEMENT'].includes(user.role) && (
          <Select label="Department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <Table
          columns={[
            { key: 'code', header: 'Code', render: (r) => r.employee.employeeCode },
            { key: 'name', header: 'Name', render: (r) => `${r.employee.firstName} ${r.employee.lastName}` },
            { key: 'department', header: 'Department', render: (r) => r.employee.department?.name || '-' },
            { key: 'PRESENT', header: 'Present' },
            { key: 'LATE', header: 'Late' },
            { key: 'ABSENT', header: 'Absent' },
            { key: 'HALF_DAY', header: 'Half-day' },
            { key: 'LEAVE', header: 'Leave' },
          ]}
          rows={rows}
        />
      )}
    </Card>
  );
}

function ManualCorrection() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: '', date: '', checkIn: '', checkOut: '', status: 'PRESENT', note: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    api.get('/employees').then((res) => setEmployees(res.data));
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const payload = {
        ...form,
        checkIn: form.checkIn ? `${form.date}T${form.checkIn}:00` : null,
        checkOut: form.checkOut ? `${form.date}T${form.checkOut}:00` : null,
      };
      await api.post('/attendance/manual', payload);
      setMessage('Attendance record saved.');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function checkDevice() {
    const { data } = await api.get('/attendance/device-status');
    setDeviceStatus(data);
  }

  async function triggerSync() {
    setSyncing(true);
    try {
      const { data } = await api.post('/attendance/sync');
      setMessage(`Sync complete: imported ${data.imported} punch(es), updated ${data.employeesUpdated} record(s).`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <Card title="ZKTeco Device">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={checkDevice}>
            Check Device Status
          </Button>
          <Button variant="secondary" onClick={triggerSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
        {deviceStatus && (
          <p className="text-sm mt-2">
            Device: <Badge color={deviceStatus.online ? 'green' : 'red'}>{deviceStatus.online ? 'Online' : 'Offline'}</Badge>
          </p>
        )}
      </Card>

      <Card title="Manual Attendance Correction">
        <form onSubmit={submit} className="space-y-3">
          <Select label="Employee" value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} required>
            <option value="">Select employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.employeeCode} - {e.firstName} {e.lastName}
              </option>
            ))}
          </Select>
          <Input label="Date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Check In" type="time" value={form.checkIn} onChange={(e) => set('checkIn', e.target.value)} />
            <Input label="Check Out" type="time" value={form.checkOut} onChange={(e) => set('checkOut', e.target.value)} />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="ABSENT">Absent</option>
            <option value="HALF_DAY">Half-day</option>
            <option value="LEAVE">Leave</option>
            <option value="HOLIDAY">Holiday</option>
            <option value="WEEKEND">Weekend</option>
          </Select>
          <Input label="Note (required)" value={form.note} onChange={(e) => set('note', e.target.value)} required />
          <ErrorText>{error}</ErrorText>
          {message && <p className="text-sm text-green-600">{message}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
