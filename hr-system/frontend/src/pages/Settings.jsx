import { useEffect, useState } from 'react';
import api from '../api/client';
import { Card, Tabs, Table, Input, Select, Button, ErrorText, extractErrorMessage } from '../components/ui';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Settings() {
  const tabs = [
    { key: 'system', label: 'Shift & Overtime' },
    { key: 'leaveTypes', label: 'Leave Types' },
    { key: 'allowanceTypes', label: 'Allowance Types' },
    { key: 'holidays', label: 'Holiday Calendar' },
    { key: 'departments', label: 'Departments' },
    { key: 'designations', label: 'Designations' },
  ];
  const [tab, setTab] = useState('system');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">System Settings</h1>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'system' && <SystemTab />}
      {tab === 'leaveTypes' && <LeaveTypesTab />}
      {tab === 'allowanceTypes' && <AllowanceTypesTab />}
      {tab === 'holidays' && <HolidaysTab />}
      {tab === 'departments' && <SimpleListTab kind="departments" fieldKey="name" />}
      {tab === 'designations' && <SimpleListTab kind="designations" fieldKey="title" />}
    </div>
  );
}

function SystemTab() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/settings').then((res) => setForm(res.data));
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleDay(day) {
    setForm((f) => {
      const set = new Set(f.weeklyHolidays);
      if (set.has(day)) set.delete(day);
      else set.add(day);
      return { ...f, weeklyHolidays: [...set] };
    });
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const { id, updatedAt, ...payload } = form;
      const { data } = await api.put('/settings', payload);
      setForm(data);
      setMessage('Settings saved.');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!form) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <Card>
      <form onSubmit={save} className="space-y-4 max-w-lg">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Weekly Holiday(s)</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((label, i) => (
              <label key={label} className="flex items-center gap-1 text-sm border rounded px-2 py-1">
                <input type="checkbox" checked={form.weeklyHolidays.includes(i)} onChange={() => toggleDay(i)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Shift Start" type="time" value={form.shiftStart} onChange={(e) => set('shiftStart', e.target.value)} />
          <Input label="Shift End" type="time" value={form.shiftEnd} onChange={(e) => set('shiftEnd', e.target.value)} />
          <Input
            label="Late Grace Period (minutes)"
            type="number"
            min="0"
            value={form.gracePeriodMinutes}
            onChange={(e) => set('gracePeriodMinutes', Number(e.target.value))}
          />
          <Input
            label="Half-day Threshold (hours worked)"
            type="number"
            min="0"
            step="0.5"
            value={form.halfDayThresholdHrs}
            onChange={(e) => set('halfDayThresholdHrs', Number(e.target.value))}
          />
          <Input
            label="Overtime Rate Multiplier"
            type="number"
            min="0"
            step="0.1"
            value={form.otRateMultiplier}
            onChange={(e) => set('otRateMultiplier', Number(e.target.value))}
          />
          <Input
            label="Daily OT Cap (hours)"
            type="number"
            min="0"
            step="0.5"
            value={form.otDailyCapHours}
            onChange={(e) => set('otDailyCapHours', Number(e.target.value))}
          />
          <Input
            label="Monthly OT Cap (hours)"
            type="number"
            min="0"
            step="1"
            value={form.otMonthlyCapHours}
            onChange={(e) => set('otMonthlyCapHours', Number(e.target.value))}
          />
          <Input
            label="Attendance Sync Interval (minutes)"
            type="number"
            min="1"
            value={form.attendanceSyncIntervalMinutes}
            onChange={(e) => set('attendanceSyncIntervalMinutes', Number(e.target.value))}
          />
        </div>

        <ErrorText>{error}</ErrorText>
        {message && <p className="text-sm text-green-600">{message}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>
    </Card>
  );
}

function LeaveTypesTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', entitlementPermanent: 0, entitlementTemporary: 0, requiresApproval: true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await api.get('/settings/leave-types');
    setItems(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/settings/leave-types', form);
      setForm({ name: '', entitlementPermanent: 0, entitlementTemporary: 0, requiresApproval: true });
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    await api.delete(`/settings/leave-types/${id}`);
    load();
  }

  return (
    <Card>
      <Table
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'entitlementPermanent', header: 'Permanent (days/yr)' },
          { key: 'entitlementTemporary', header: 'Temporary (days/yr)' },
          { key: 'requiresApproval', header: 'Approval Required', render: (r) => (r.requiresApproval ? 'Yes' : 'No') },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <button className="text-red-600 text-xs hover:underline" onClick={() => remove(r.id)}>
                Remove
              </button>
            ),
          },
        ]}
        rows={items}
      />
      <form onSubmit={submit} className="flex flex-wrap gap-3 items-end mt-4 border-t pt-4">
        <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <Input
          label="Permanent days/yr"
          type="number"
          min="0"
          value={form.entitlementPermanent}
          onChange={(e) => setForm((f) => ({ ...f, entitlementPermanent: Number(e.target.value) }))}
        />
        <Input
          label="Temporary days/yr"
          type="number"
          min="0"
          value={form.entitlementTemporary}
          onChange={(e) => setForm((f) => ({ ...f, entitlementTemporary: Number(e.target.value) }))}
        />
        <label className="flex items-center gap-1 text-sm mb-1.5">
          <input
            type="checkbox"
            checked={form.requiresApproval}
            onChange={(e) => setForm((f) => ({ ...f, requiresApproval: e.target.checked }))}
          />
          Requires approval
        </label>
        <Button type="submit" disabled={busy}>
          Add
        </Button>
      </form>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function AllowanceTypesTab() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get('/settings/allowance-types');
    setItems(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/settings/allowance-types', { name });
      setName('');
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  async function remove(id) {
    await api.delete(`/settings/allowance-types/${id}`);
    load();
  }

  return (
    <Card>
      <Table
        columns={[
          { key: 'name', header: 'Name' },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <button className="text-red-600 text-xs hover:underline" onClick={() => remove(r.id)}>
                Remove
              </button>
            ),
          },
        ]}
        rows={items}
      />
      <form onSubmit={submit} className="flex gap-3 items-end mt-4 border-t pt-4">
        <Input label="Allowance Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Button type="submit">Add</Button>
      </form>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function HolidaysTab() {
  const [items, setItems] = useState([]);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const year = new Date().getFullYear();

  async function load() {
    const { data } = await api.get('/settings/holidays', { params: { year } });
    setItems(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/settings/holidays', { date, name });
      setDate('');
      setName('');
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  async function remove(id) {
    await api.delete(`/settings/holidays/${id}`);
    load();
  }

  return (
    <Card title={`Holidays ${year}`}>
      <Table
        columns={[
          { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
          { key: 'name', header: 'Name' },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <button className="text-red-600 text-xs hover:underline" onClick={() => remove(r.id)}>
                Remove
              </button>
            ),
          },
        ]}
        rows={items}
      />
      <form onSubmit={submit} className="flex gap-3 items-end mt-4 border-t pt-4">
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Button type="submit">Add</Button>
      </form>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function SimpleListTab({ kind, fieldKey }) {
  const [items, setItems] = useState([]);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get(`/${kind}`);
    setItems(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/${kind}`, { [fieldKey]: value });
      setValue('');
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  async function remove(id) {
    await api.delete(`/${kind}/${id}`);
    load();
  }

  return (
    <Card>
      <Table
        columns={[
          { key: fieldKey, header: 'Name' },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <button className="text-red-600 text-xs hover:underline" onClick={() => remove(r.id)}>
                Remove
              </button>
            ),
          },
        ]}
        rows={items}
      />
      <form onSubmit={submit} className="flex gap-3 items-end mt-4 border-t pt-4">
        <Input label="Name" value={value} onChange={(e) => setValue(e.target.value)} required />
        <Button type="submit">Add</Button>
      </form>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
