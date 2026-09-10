import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Table, Badge, Button, Input, Select, Modal, ErrorText, extractErrorMessage } from '../components/ui';

export default function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/employees', { params: { q: q || undefined } });
    setEmployees(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    api.get('/departments').then((res) => setDepartments(res.data));
    api.get('/designations').then((res) => setDesignations(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Employees</h1>
        {user.role === 'HR_ADMIN' && <Button onClick={() => setShowCreate(true)}>+ Add Employee</Button>}
      </div>

      <Card>
        <div className="mb-4 max-w-xs">
          <Input placeholder="Search by name or code" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <Table
            columns={[
              { key: 'employeeCode', header: 'Code' },
              {
                key: 'name',
                header: 'Name',
                render: (r) => (
                  <Link to={`/employees/${r.id}`} className="text-brand-600 hover:underline">
                    {r.firstName} {r.lastName}
                  </Link>
                ),
              },
              { key: 'department', header: 'Department', render: (r) => r.department?.name || '-' },
              { key: 'designation', header: 'Designation', render: (r) => r.designation?.title || '-' },
              { key: 'employmentType', header: 'Type' },
              {
                key: 'employmentStatus',
                header: 'Status',
                render: (r) => <Badge color={r.employmentStatus === 'ACTIVE' ? 'green' : 'gray'}>{r.employmentStatus}</Badge>,
              },
            ]}
            rows={employees}
          />
        )}
      </Card>

      {showCreate && (
        <CreateEmployeeModal
          departments={departments}
          designations={designations}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateEmployeeModal({ departments, designations, onClose, onCreated }) {
  const [form, setForm] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    joiningDate: '',
    departmentId: '',
    designationId: '',
    employmentType: 'PERMANENT',
  });
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
      await api.post('/employees', { ...form, departmentId: form.departmentId || undefined, designationId: form.designationId || undefined });
      onCreated();
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
      title="Add Employee"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Employee Code (device ID)" value={form.employeeCode} onChange={(e) => set('employeeCode', e.target.value)} required />
          <Input label="Joining Date" type="date" value={form.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} required />
          <Input label="First Name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
          <Input label="Last Name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
          <Select label="Department" value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)}>
            <option value="">-</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select label="Designation" value={form.designationId} onChange={(e) => set('designationId', e.target.value)}>
            <option value="">-</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </Select>
          <Select label="Employment Type" value={form.employmentType} onChange={(e) => set('employmentType', e.target.value)}>
            <option value="PERMANENT">Permanent</option>
            <option value="TEMPORARY">Temporary</option>
          </Select>
        </div>
        <ErrorText>{error}</ErrorText>
      </form>
    </Modal>
  );
}
