import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', roles: ['HR_ADMIN', 'MANAGEMENT'] },
  { to: '/profile', label: 'My Profile', roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'MANAGEMENT'] },
  { to: '/employees', label: 'Employees', roles: ['HR_ADMIN', 'MANAGEMENT', 'MANAGER'] },
  { to: '/attendance', label: 'Attendance', roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'MANAGEMENT'] },
  { to: '/leave', label: 'Leave', roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'MANAGEMENT'] },
  { to: '/overtime', label: 'Overtime', roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'MANAGEMENT'] },
  { to: '/payroll', label: 'Payroll', roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'MANAGEMENT'] },
  { to: '/reports', label: 'Reports', roles: ['HR_ADMIN', 'MANAGEMENT'] },
  { to: '/settings', label: 'Settings', roles: ['HR_ADMIN'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const items = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 bg-brand-700 text-white flex flex-col">
        <div className="px-4 py-5 border-b border-brand-600">
          <p className="font-semibold leading-tight">Rahmania HR</p>
          <p className="text-xs text-brand-100">Corporation</p>
        </div>
        <nav className="flex-1 py-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm ${isActive ? 'bg-brand-600 font-medium' : 'text-brand-50 hover:bg-brand-600/60'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b flex items-center justify-between px-6">
          <div />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">
                {user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email}
              </p>
              <p className="text-xs text-gray-400">{user.role.replace('_', ' ')}</p>
            </div>
            <button onClick={logout} className="text-sm text-brand-600 hover:underline">
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
