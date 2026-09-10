import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Tabs, Input, Select, Button, Badge, ErrorText, extractErrorMessage } from '../components/ui';

export default function EmployeeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [allowanceTypes, setAllowanceTypes] = useState([]);
  const [tab, setTab] = useState('profile');
  const isHr = user.role === 'HR_ADMIN';

  async function load() {
    const { data } = await api.get(`/employees/${id}`);
    setEmployee(data);
  }

  useEffect(() => {
    load();
    api.get('/departments').then((res) => setDepartments(res.data));
    api.get('/designations').then((res) => setDesignations(res.data));
    api.get('/settings/allowance-types').then((res) => setAllowanceTypes(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!employee) return <p className="text-sm text-gray-500">Loading...</p>;

  const tabs = [
    { key: 'profile', label: 'Profile' },
    { key: 'documents', label: 'Documents' },
    ...(isHr ? [{ key: 'salary', label: 'Salary Structure' }, { key: 'account', label: 'Account' }] : []),
  ];

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">
          {employee.firstName} {employee.lastName}
        </h1>
        <Badge color={employee.employmentStatus === 'ACTIVE' ? 'green' : 'gray'}>{employee.employmentStatus}</Badge>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'profile' && (
        <ProfileTab employee={employee} departments={departments} designations={designations} isHr={isHr} onSaved={load} />
      )}
      {tab === 'documents' && <DocumentsTab employee={employee} isHr={isHr} onSaved={load} />}
      {tab === 'salary' && isHr && <SalaryTab employeeId={employee.id} allowanceTypes={allowanceTypes} />}
      {tab === 'account' && isHr && <AccountTab employee={employee} onSaved={load} />}
    </div>
  );
}

function ProfileTab({ employee, departments, designations, isHr, onSaved }) {
  const [form, setForm] = useState({
    firstName: employee.firstName,
    lastName: employee.lastName,
    phone: employee.phone || '',
    email: employee.email || '',
    address: employee.address || '',
    nid: employee.nid || '',
    departmentId: employee.departmentId || '',
    designationId: employee.designationId || '',
    employmentType: employee.employmentType,
    employmentStatus: employee.employmentStatus,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.put(`/employees/${employee.id}`, form);
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={save} className="grid grid-cols-2 gap-3">
        <Input label="First Name" value={form.firstName} disabled={!isHr} onChange={(e) => set('firstName', e.target.value)} />
        <Input label="Last Name" value={form.lastName} disabled={!isHr} onChange={(e) => set('lastName', e.target.value)} />
        <Input label="Phone" value={form.phone} disabled={!isHr} onChange={(e) => set('phone', e.target.value)} />
        <Input label="Email" value={form.email} disabled={!isHr} onChange={(e) => set('email', e.target.value)} />
        <Input label="NID" value={form.nid} disabled={!isHr} onChange={(e) => set('nid', e.target.value)} />
        <Input label="Address" value={form.address} disabled={!isHr} onChange={(e) => set('address', e.target.value)} />
        <Select label="Department" value={form.departmentId} disabled={!isHr} onChange={(e) => set('departmentId', e.target.value)}>
          <option value="">-</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select label="Designation" value={form.designationId} disabled={!isHr} onChange={(e) => set('designationId', e.target.value)}>
          <option value="">-</option>
          {designations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </Select>
        <Select label="Employment Type" value={form.employmentType} disabled={!isHr} onChange={(e) => set('employmentType', e.target.value)}>
          <option value="PERMANENT">Permanent</option>
          <option value="TEMPORARY">Temporary</option>
        </Select>
        <Select label="Status" value={form.employmentStatus} disabled={!isHr} onChange={(e) => set('employmentStatus', e.target.value)}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="RESIGNED">Resigned</option>
          <option value="TERMINATED">Terminated</option>
        </Select>
        {isHr && (
          <div className="col-span-2">
            <ErrorText>{error}</ErrorText>
            <Button type="submit" disabled={busy} className="mt-2">
              {busy ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

function DocumentsTab({ employee, isHr, onSaved }) {
  const [type, setType] = useState('NID');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function upload(e) {
    e.preventDefault();
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('document', file);
      fd.append('type', type);
      await api.post(`/employees/${employee.id}/documents`, fd);
      setFile(null);
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <ul className="divide-y mb-4">
        {employee.documents?.length ? (
          employee.documents.map((d) => (
            <li key={d.id} className="py-2 flex items-center justify-between text-sm">
              <span>{d.type}</span>
              <a href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000'}${d.fileUrl}`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                View
              </a>
            </li>
          ))
        ) : (
          <p className="text-sm text-gray-500 py-2">No documents uploaded.</p>
        )}
      </ul>

      {isHr && (
        <form onSubmit={upload} className="flex items-end gap-3">
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="NID">NID</option>
            <option value="CONTRACT">Contract</option>
            <option value="CERTIFICATE">Certificate</option>
            <option value="OTHER">Other</option>
          </Select>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} className="text-sm" />
          <Button type="submit" disabled={busy || !file}>
            Upload
          </Button>
        </form>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function SalaryTab({ employeeId, allowanceTypes }) {
  const [basicSalary, setBasicSalary] = useState('');
  const [amounts, setAmounts] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/payroll/salary-structure/${employeeId}`).then((res) => {
      if (res.data) {
        setBasicSalary(res.data.basicSalary);
        const map = {};
        res.data.allowances.forEach((a) => {
          map[a.allowanceTypeId] = a.amount;
        });
        setAmounts(map);
      }
    });
  }, [employeeId]);

  async function save(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const allowances = Object.entries(amounts)
        .filter(([, v]) => Number(v) > 0)
        .map(([allowanceTypeId, amount]) => ({ allowanceTypeId, amount: Number(amount) }));
      await api.put(`/payroll/salary-structure/${employeeId}`, { basicSalary: Number(basicSalary), allowances });
      setMessage('Salary structure saved.');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-3 max-w-sm">
        <Input label="Basic Salary" type="number" min="0" value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} required />
        {allowanceTypes.map((a) => (
          <Input
            key={a.id}
            label={a.name}
            type="number"
            min="0"
            value={amounts[a.id] || ''}
            onChange={(e) => setAmounts((m) => ({ ...m, [a.id]: e.target.value }))}
          />
        ))}
        <ErrorText>{error}</ErrorText>
        {message && <p className="text-sm text-green-600">{message}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Card>
  );
}

function AccountTab({ employee, onSaved }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function createAccount(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post(`/employees/${employee.id}/account`, { email, role });
      setResult(data);
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    const { data } = await api.post(`/employees/${employee.id}/account/reset-password`);
    setResult(data);
  }

  if (employee.user) {
    return (
      <Card>
        <p className="text-sm">
          Email: <span className="font-medium">{employee.user.email}</span>
        </p>
        <p className="text-sm">
          Role: <span className="font-medium">{employee.user.role}</span>
        </p>
        <p className="text-sm">
          Status: <span className="font-medium">{employee.user.isActive ? 'Active' : 'Disabled'}</span>
        </p>
        <Button variant="secondary" className="mt-3" onClick={resetPassword}>
          Reset Password
        </Button>
        {result?.tempPassword && (
          <p className="text-sm text-green-700 mt-2">Temporary password: {result.tempPassword} (share securely, ask user to change it)</p>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm text-gray-500 mb-3">
        This employee has no self-service login yet. Temporary employees don't get one by default - creating an account here overrides that.
      </p>
      <form onSubmit={createAccount} className="space-y-3 max-w-sm">
        <Input label="Login Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="EMPLOYEE">Employee</option>
          <option value="MANAGER">Manager</option>
          <option value="HR_ADMIN">HR / Admin</option>
          <option value="MANAGEMENT">Management</option>
        </Select>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={busy}>
          {busy ? 'Creating...' : 'Create Account'}
        </Button>
      </form>
      {result?.tempPassword && (
        <p className="text-sm text-green-700 mt-3">
          Account created. Temporary password: <span className="font-medium">{result.tempPassword}</span>
        </p>
      )}
    </Card>
  );
}
