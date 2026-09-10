import { useEffect, useState } from 'react';
import api from '../api/client';
import { Card, StatCard } from '../components/ui';

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then((res) => setData(res.data));
  }, []);

  if (!data) return <p className="text-sm text-gray-500">Loading...</p>;

  const maxHours = Math.max(1, ...data.otTrend.map((t) => t.hours));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Headcount" value={data.headcount.total} sub={`${data.headcount.permanent} permanent / ${data.headcount.temporary} temporary`} />
        <StatCard label="Today's Attendance" value={`${data.todayAttendancePct}%`} />
        <StatCard label="Pending Leave Requests" value={data.pendingLeaveRequests} />
        <StatCard
          label="This Month's Payroll Cost"
          value={data.monthlyPayrollCost != null ? data.monthlyPayrollCost.toFixed(2) : '-'}
          sub={data.payrollRunStatus || 'Not run yet'}
        />
      </div>

      <Card title="Overtime Hours Trend (this month)">
        {data.otTrend.length === 0 ? (
          <p className="text-sm text-gray-500">No approved overtime yet this month.</p>
        ) : (
          <div className="space-y-1">
            {data.otTrend.map((t) => (
              <div key={t.date} className="flex items-center gap-2 text-xs">
                <span className="w-20 text-gray-500">{t.date}</span>
                <div className="flex-1 bg-gray-100 rounded h-3">
                  <div className="bg-brand-500 h-3 rounded" style={{ width: `${(t.hours / maxHours) * 100}%` }} />
                </div>
                <span className="w-10 text-right text-gray-600">{t.hours}h</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
