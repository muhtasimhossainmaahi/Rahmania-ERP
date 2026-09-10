import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Input, Button, ErrorText, extractErrorMessage } from '../components/ui';

export default function Profile() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    if (user.employee) {
      api.get('/employees/me').then((res) => setEmployee(res.data));
    }
  }, [user.employee]);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>

      {employee && (
        <Card title="Employee Details">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <Row label="Employee Code" value={employee.employeeCode} />
            <Row label="Name" value={`${employee.firstName} ${employee.lastName}`} />
            <Row label="Department" value={employee.department?.name || '-'} />
            <Row label="Designation" value={employee.designation?.title || '-'} />
            <Row label="Employment Type" value={employee.employmentType} />
            <Row label="Status" value={employee.employmentStatus} />
            <Row label="Joining Date" value={new Date(employee.joiningDate).toLocaleDateString()} />
            <Row label="Phone" value={employee.phone || '-'} />
            <Row label="Email" value={employee.email || '-'} />
            <Row label="Manager" value={employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : '-'} />
          </dl>
        </Card>
      )}

      <ChangePassword />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium">{value}</dd>
    </>
  );
}

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setMessage('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Change Password">
      <form onSubmit={submit} className="space-y-3 max-w-sm">
        <Input label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
        <ErrorText>{error}</ErrorText>
        {message && <p className="text-sm text-green-600">{message}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? 'Updating...' : 'Update Password'}
        </Button>
      </form>
    </Card>
  );
}
