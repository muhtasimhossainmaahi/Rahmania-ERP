import { useState } from 'react';
import { Card, Select, Button } from '../components/ui';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace('/api', '');

function download(path) {
  const token = localStorage.getItem('hr_token');
  fetch(`${API_ROOT}/api${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => res.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop().split('?')[0] + '.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    });
}

export default function Reports() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const reports = [
    { label: 'Attendance Register', path: `/reports/attendance-register?month=${month}&year=${year}` },
    { label: 'Leave Report (year)', path: `/reports/leave-report?year=${year}` },
    { label: 'Payroll Register', path: `/reports/payroll-register?month=${month}&year=${year}` },
    { label: 'Overtime Report', path: `/reports/overtime-report?month=${month}&year=${year}` },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Reports</h1>
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
        <div className="grid grid-cols-2 gap-3">
          {reports.map((r) => (
            <div key={r.label} className="border rounded-md p-3 flex items-center justify-between">
              <span className="text-sm">{r.label}</span>
              <Button variant="secondary" onClick={() => download(r.path)}>
                Download
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
