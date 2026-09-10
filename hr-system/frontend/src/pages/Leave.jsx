import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Tabs, Table, Badge, Select, Input, Button, Modal, ErrorText, extractErrorMessage, STATUS_COLORS } from '../components/ui';

export default function Leave() {
  const { user } = useAuth();
  const canApprove = ['MANAGER', 'HR_ADMIN', 'MANAGEMENT'].includes(user.role);

  const tabs = [
    ...(user.employee ? [{ key: 'my', label: 'My Leave' }] : []),
    ...(canApprove ? [{ key: 'approvals', label: 'Approvals' }] : []),
    ...(canApprove ? [{ key: 'calendar', label: 'Leave Calendar' }] : []),
  ];
  const [tab, setTab] = useState(tabs[0]?.key);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Leave</h1>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'my' && <MyLeave />}
      {tab === 'approvals' && <Approvals />}
      {tab === 'calendar' && <LeaveCalendar />}
    </div>
  );
}

function MyLeave() {
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [showApply, setShowApply] = useState(false);

  async function load() {
    const [b, r] = await Promise.all([api.get('/leave/balances'), api.get('/leave/requests')]);
    setBalances(b.data);
    setRequests(r.data);
  }

  useEffect(() => {
    load();
    api.get('/settings/leave-types').then((res) => setLeaveTypes(res.data));
  }, []);

  async function cancel(id) {
    await api.delete(`/leave/requests/${id}`);
    load();
  }

  return (
    <div className="space-y-4">
      <Card title="Leave Balances">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {balances.map((b) => (
            <div key={b.leaveType.id} className="border rounded-md p-3">
              <p className="text-sm font-medium text-gray-800">{b.leaveType.name}</p>
              <p className="text-xs text-gray-500">
                {b.remaining} of {b.entitlement} day(s) remaining
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="My Requests" actions={<Button onClick={() => setShowApply(true)}>+ Apply for Leave</Button>}>
        <Table
          columns={[
            { key: 'leaveType', header: 'Type', render: (r) => r.leaveType.name },
            { key: 'startDate', header: 'From', render: (r) => new Date(r.startDate).toLocaleDateString() },
            { key: 'endDate', header: 'To', render: (r) => new Date(r.endDate).toLocaleDateString() },
            { key: 'days', header: 'Days' },
            { key: 'status', header: 'Status', render: (r) => <Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge> },
            {
              key: 'actions',
              header: '',
              render: (r) =>
                r.status === 'PENDING' && (
                  <button className="text-red-600 text-xs hover:underline" onClick={() => cancel(r.id)}>
                    Cancel
                  </button>
                ),
            },
          ]}
          rows={requests}
        />
      </Card>

      {showApply && (
        <ApplyLeaveModal
          leaveTypes={leaveTypes}
          onClose={() => setShowApply(false)}
          onApplied={() => {
            setShowApply(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ApplyLeaveModal({ leaveTypes, onClose, onApplied }) {
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/leave/requests', form);
      onApplied();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Apply for Leave"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Submitting...' : 'Submit'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <Select label="Leave Type" value={form.leaveTypeId} onChange={(e) => set('leaveTypeId', e.target.value)} required>
          <option value="">Select</option>
          {leaveTypes.map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.name}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} required />
          <Input label="End Date" type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} required />
        </div>
        <Input label="Reason" value={form.reason} onChange={(e) => set('reason', e.target.value)} />
        <ErrorText>{error}</ErrorText>
      </form>
    </Modal>
  );
}

function Approvals() {
  const [requests, setRequests] = useState([]);

  async function load() {
    const { data } = await api.get('/leave/requests', { params: { status: 'PENDING' } });
    setRequests(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id, status) {
    await api.put(`/leave/requests/${id}/decision`, { status });
    load();
  }

  return (
    <Card title="Pending Leave Requests">
      <Table
        columns={[
          { key: 'employee', header: 'Employee', render: (r) => `${r.employee.firstName} ${r.employee.lastName} (${r.employee.employeeCode})` },
          { key: 'leaveType', header: 'Type', render: (r) => r.leaveType.name },
          { key: 'startDate', header: 'From', render: (r) => new Date(r.startDate).toLocaleDateString() },
          { key: 'endDate', header: 'To', render: (r) => new Date(r.endDate).toLocaleDateString() },
          { key: 'days', header: 'Days' },
          { key: 'reason', header: 'Reason', render: (r) => r.reason || '-' },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="flex gap-2">
                <Button variant="primary" className="!px-2 !py-1" onClick={() => decide(r.id, 'APPROVED')}>
                  Approve
                </Button>
                <Button variant="danger" className="!px-2 !py-1" onClick={() => decide(r.id, 'REJECTED')}>
                  Reject
                </Button>
              </div>
            ),
          },
        ]}
        rows={requests}
      />
    </Card>
  );
}

function LeaveCalendar() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/leave/calendar', { params: { month, year } }).then((res) => setItems(res.data));
  }, [month, year]);

  return (
    <Card>
      <div className="flex gap-2 mb-4">
        <Select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </Select>
        <Select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>
      <Table
        columns={[
          { key: 'employee', header: 'Employee', render: (r) => `${r.employee.firstName} ${r.employee.lastName}` },
          { key: 'leaveType', header: 'Type', render: (r) => r.leaveType.name },
          { key: 'startDate', header: 'From', render: (r) => new Date(r.startDate).toLocaleDateString() },
          { key: 'endDate', header: 'To', render: (r) => new Date(r.endDate).toLocaleDateString() },
        ]}
        rows={items}
      />
    </Card>
  );
}
