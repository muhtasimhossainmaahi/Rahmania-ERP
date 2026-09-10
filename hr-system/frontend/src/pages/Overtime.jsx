import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Tabs, Table, Badge, Select, Button, STATUS_COLORS } from '../components/ui';

export default function Overtime() {
  const { user } = useAuth();
  const canApprove = ['MANAGER', 'HR_ADMIN', 'MANAGEMENT'].includes(user.role);

  const tabs = [
    ...(user.employee ? [{ key: 'my', label: 'My Overtime' }] : []),
    ...(canApprove ? [{ key: 'approvals', label: 'Approvals' }] : []),
    ...(canApprove ? [{ key: 'report', label: 'Summary Report' }] : []),
  ];
  const [tab, setTab] = useState(tabs[0]?.key);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Overtime</h1>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'my' && <MyOvertime />}
      {tab === 'approvals' && <Approvals />}
      {tab === 'report' && <SummaryReport />}
    </div>
  );
}

function MyOvertime() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    api.get('/overtime').then((res) => setRecords(res.data));
  }, []);

  return (
    <Card>
      <Table
        columns={[
          { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
          { key: 'hours', header: 'Hours' },
          { key: 'rateMultiplier', header: 'Rate' },
          { key: 'status', header: 'Status', render: (r) => <Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge> },
        ]}
        rows={records}
      />
    </Card>
  );
}

function Approvals() {
  const [records, setRecords] = useState([]);

  async function load() {
    const { data } = await api.get('/overtime', { params: { status: 'PENDING' } });
    setRecords(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id, status) {
    await api.put(`/overtime/${id}/decision`, { status });
    load();
  }

  return (
    <Card title="Pending Overtime">
      <Table
        columns={[
          { key: 'employee', header: 'Employee', render: (r) => `${r.employee.firstName} ${r.employee.lastName} (${r.employee.employeeCode})` },
          { key: 'department', header: 'Department', render: (r) => r.employee.department?.name || '-' },
          { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
          { key: 'hours', header: 'Hours' },
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
        rows={records}
      />
    </Card>
  );
}

function SummaryReport() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState([]);

  useEffect(() => {
    api.get('/overtime/summary', { params: { month, year } }).then((res) => setSummary(res.data));
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
          { key: 'code', header: 'Code', render: (r) => r.employee.employeeCode },
          { key: 'name', header: 'Name', render: (r) => `${r.employee.firstName} ${r.employee.lastName}` },
          { key: 'department', header: 'Department', render: (r) => r.employee.department?.name || '-' },
          { key: 'approvedHours', header: 'Approved Hours' },
          { key: 'pendingHours', header: 'Pending Hours' },
        ]}
        rows={summary.map((s, i) => ({ id: i, ...s }))}
      />
    </Card>
  );
}
