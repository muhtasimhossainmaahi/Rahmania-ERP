import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Overtime from './pages/Overtime';
import Payroll from './pages/Payroll';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function RequireRole({ user, roles, children }) {
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Loading...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  const homePath = ['HR_ADMIN', 'MANAGEMENT'].includes(user.role) ? '/dashboard' : '/profile';

  return (
    <Routes>
      <Route path="/login" element={<Navigate to={homePath} replace />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to={homePath} replace />} />
        <Route
          path="/dashboard"
          element={
            <RequireRole user={user} roles={['HR_ADMIN', 'MANAGEMENT']}>
              <Dashboard />
            </RequireRole>
          }
        />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/employees"
          element={
            <RequireRole user={user} roles={['HR_ADMIN', 'MANAGEMENT', 'MANAGER']}>
              <Employees />
            </RequireRole>
          }
        />
        <Route
          path="/employees/:id"
          element={
            <RequireRole user={user} roles={['HR_ADMIN', 'MANAGEMENT', 'MANAGER']}>
              <EmployeeDetail />
            </RequireRole>
          }
        />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/leave" element={<Leave />} />
        <Route path="/overtime" element={<Overtime />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route
          path="/reports"
          element={
            <RequireRole user={user} roles={['HR_ADMIN', 'MANAGEMENT']}>
              <Reports />
            </RequireRole>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireRole user={user} roles={['HR_ADMIN']}>
              <Settings />
            </RequireRole>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to={homePath} replace />} />
    </Routes>
  );
}
