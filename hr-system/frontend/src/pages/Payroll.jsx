import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Tabs, Table, Badge, Select, Input, Button, Modal, ErrorText, extractErrorMessage, STATUS_COLORS } from '../components/ui';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace('/api', '');

export default function Payroll() {
  const { user } = useAuth();
  const isHr = user.role === 'HR_ADMIN';

  const tabs = [
    ...(user.employee ? [{ key: 'payslips', label: 'My Payslips' }] : []),
    ...(isHr ? [{ key: 'runs', label: 'Payroll Runs' }] : []),
  ];
  const [tab, setTab] = useState(tabs[0]?.key);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Payroll</h1>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'payslips' && <MyPayslips />}
      {tab === 'runs' && <PayrollRuns />}
    </div>
  );
}

function MyPayslips() {
  const [payslips, setPayslips] = useState([]);

  useEffect(() => {
    api.get('/payroll/payslips').then((res) => setPayslips(res.data));
  }, []);

  return (
    <Card>
      <Table
        columns={[
          { key: 'period', header: 'Period', render: (r) => `${r.payrollRun.month}/${r.payrollRun.year}` },
          { key: 'grossSalary', header: 'Gross' },
          { key: 'overtimePay', header: 'OT Pay' },
          { key: 'netPay', header: 'Net Pay' },
          {
            key: 'pdf',
            header: '',
            render: (r) => (
              <a className="text-brand-600 hover:underline text-xs" href={`${API_ROOT}/api/payroll/payslips/${r.id}/pdf`} target="_blank" rel="noreferrer">
                Download PDF
              </a>
            ),
          },
        ]}
        rows={payslips}
      />
    </Card>
  );
}

function PayrollRuns() {
  const [runs, setRuns] = useState([]);
  const [selected, setSelected] = useState(null);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadRuns() {
    const { data } = await api.get('/payroll/runs');
    setRuns(data);
  }

  useEffect(() => {
    loadRuns();
  }, []);

  async function openRun(id) {
    const { data } = await api.get(`/payroll/runs/${id}`);
    setSelected(data);
  }

  async function calculate() {
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/payroll/runs/calculate', { month, year });
      await loadRuns();
      setSelected(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (selected) {
    return <RunDetail run={selected} onBack={() => setSelected(null)} onRefresh={async () => { await loadRuns(); openRun(selected.id); }} />;
  }

  return (
    <div className="space-y-4">
      <Card title="Run Payroll">
        <div className="flex gap-2 items-end">
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
          <Button onClick={calculate} disabled={busy}>
            {busy ? 'Calculating...' : 'Calculate / Recalculate'}
          </Button>
        </div>
        <ErrorText>{error}</ErrorText>
      </Card>

      <Card title="Payroll Run History">
        <Table
          columns={[
            { key: 'period', header: 'Period', render: (r) => `${r.month}/${r.year}` },
            { key: 'status', header: 'Status', render: (r) => <Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge> },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <button className="text-brand-600 text-xs hover:underline" onClick={() => openRun(r.id)}>
                  View
                </button>
              ),
            },
          ]}
          rows={runs}
        />
      </Card>
    </div>
  );
}

function RunDetail({ run, onBack, onRefresh }) {
  const [employees, setEmployees] = useState([]);
  const [showDeduction, setShowDeduction] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/employees').then((res) => setEmployees(res.data));
  }, []);

  async function review() {
    setBusy(true);
    setError('');
    try {
      await api.put(`/payroll/runs/${run.id}/review`);
      await onRefresh();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    setBusy(true);
    setError('');
    try {
      await api.put(`/payroll/runs/${run.id}/finalize`);
      await onRefresh();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const totalNet = run.payslips.reduce((s, p) => s + p.netPay, 0);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-brand-600 hover:underline">
        ← Back to runs
      </button>

      <Card
        title={`Payroll Run: ${run.month}/${run.year}`}
        actions={
          <div className="flex gap-2 items-center">
            <Badge color={STATUS_COLORS[run.status]}>{run.status}</Badge>
            {run.status === 'DRAFT' && (
              <>
                <Button variant="secondary" onClick={() => setShowDeduction(true)}>
                  + Deduction
                </Button>
                <Button onClick={review} disabled={busy}>
                  Mark Reviewed
                </Button>
              </>
            )}
            {run.status === 'REVIEWED' && (
              <Button onClick={finalize} disabled={busy}>
                Finalize & Generate Payslips
              </Button>
            )}
          </div>
        }
      >
        <ErrorText>{error}</ErrorText>
        <p className="text-sm text-gray-500 mb-3">Total net pay: {totalNet.toFixed(2)}</p>
        <Table
          columns={[
            { key: 'code', header: 'Code', render: (r) => r.employee.employeeCode },
            { key: 'name', header: 'Name', render: (r) => `${r.employee.firstName} ${r.employee.lastName}` },
            { key: 'grossSalary', header: 'Gross' },
            { key: 'unpaidDeduction', header: 'Unpaid Ded.' },
            { key: 'overtimePay', header: 'OT Pay' },
            { key: 'manualDeductions', header: 'Manual Ded.' },
            { key: 'netPay', header: 'Net Pay' },
            {
              key: 'pdf',
              header: '',
              render: (r) =>
                run.status === 'FINALIZED' && (
                  <a className="text-brand-600 hover:underline text-xs" href={`${API_ROOT}/api/payroll/payslips/${r.id}/pdf`} target="_blank" rel="noreferrer">
                    PDF
                  </a>
                ),
            },
          ]}
          rows={run.payslips}
        />
      </Card>

      {showDeduction && (
        <DeductionModal
          employees={employees}
          runId={run.id}
          onClose={() => setShowDeduction(false)}
          onAdded={async () => {
            setShowDeduction(false);
            await onRefresh();
          }}
        />
      )}
    </div>
  );
}

function DeductionModal({ employees, runId, onClose, onAdded }) {
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post(`/payroll/runs/${runId}/deductions`, { employeeId, amount: Number(amount), reason });
      onAdded();
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
      title="Add Manual Deduction"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Saving...' : 'Add'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <Select label="Employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
          <option value="">Select employee</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.employeeCode} - {e.firstName} {e.lastName}
            </option>
          ))}
        </Select>
        <Input label="Amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <Input label="Reason (e.g. advance)" value={reason} onChange={(e) => setReason(e.target.value)} required />
        <ErrorText>{error}</ErrorText>
      </form>
    </Modal>
  );
}
