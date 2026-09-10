# Rahmania HR & Attendance Management System

A basic, self-hosted HR system for Rahmania Corporation (~60 employees).
Runs entirely on a local PC/server - no cloud services, no external
bank/payment integrations.

This is a standalone project, independent from any other Rahmania system
(codebase, repo, and database are all separate).

## Stack

- **Backend**: Node.js + Express + PostgreSQL (Prisma ORM)
- **Frontend**: React + Vite + Tailwind CSS
- **Auth**: JWT + role-based access control (Employee, Manager, HR/Admin, Management)
- **Attendance sync**: background service polling a ZKTeco K50A biometric device over LAN (TCP port 4370, SDK protocol)
- **Payslips/reports**: server-side PDF (pdfkit) and Excel (exceljs) generation

## Project layout

```
hr-system/
  backend/    Express API, Prisma schema/migrations, ZKTeco sync job
  frontend/   React + Tailwind SPA
  docker-compose.yml
```

## Local development (without Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ running locally

### Backend

```bash
cd backend
cp .env.example .env      # edit DATABASE_URL, JWT_SECRET, ZKTECO_IP, etc.
npm install
npx prisma migrate dev    # creates the database schema
npm run prisma:seed       # creates default settings, leave/allowance types, and an HR/Admin login
npm run dev                # starts the API on http://localhost:4000
```

The seed script prints the HR/Admin login (`admin@rahmania.local` /
`ChangeMe123!` by default - change this password after first login, or set
`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in `.env` before seeding).

To manually trigger an attendance sync from the device without running the
full server (useful for testing device connectivity):

```bash
npm run sync:attendance
```

### Frontend

```bash
cd frontend
cp .env.example .env      # set VITE_API_URL if the API isn't on localhost:4000
npm install
npm run dev                # starts the app on http://localhost:5173
```

## Deployment with Docker Compose

```bash
cd hr-system
cp backend/.env.example backend/.env   # optional, only needed for local (non-docker) tooling
JWT_SECRET=$(openssl rand -hex 32) docker compose up -d --build
```

This starts Postgres, the backend API (auto-runs migrations + seed on
first boot), and the frontend, all on the local machine. Set `ZKTECO_IP`
(and other `ZKTECO_*` vars) in a `.env` file next to `docker-compose.yml`
so the attendance sync service can reach the K50A terminal on the office
LAN - if the device isn't reachable from inside the Docker network, run
the backend with `network_mode: host` instead (see the comment in
`docker-compose.yml`).

## ZKTeco K50A integration

- The device must be enrolled with each employee using the **same numeric
  ID** as that employee's `employeeCode` in this system, so punches map to
  the right person automatically.
- The backend polls the device every `attendanceSyncIntervalMinutes`
  (editable at runtime under System Settings; default 5 minutes) over the
  device's standard TCP/IP SDK protocol on port 4370 - **not** the
  ADMS/cloud-push protocol.
- If the device is offline or a punch is missed, HR can add/correct an
  attendance record manually from Attendance → Manual Correction & Sync
  (a note is required and is kept on the record).
- A nightly job (23:55 local time) marks any active employee who never
  punched at all that day as Absent, unless they're on approved leave or
  it's a company/weekly holiday.

## Runtime-configurable settings

Everything below is editable by HR/Admin from **Settings** in the app, with
no code change or redeploy required:

- Weekly holiday day(s)
- Shift start/end time and late-arrival grace period
- Half-day threshold (hours worked)
- Leave types and their annual entitlement (separately for Permanent vs Temporary)
- Overtime rate multiplier and daily/monthly caps
- Salary allowance components (e.g. House Rent, Medical, Transport)
- Company holiday calendar
- Attendance sync interval

## Roles

| Role | Access |
|---|---|
| Employee | Own profile, attendance, leave, overtime, payslips |
| Manager | Everything Employee has, plus team attendance/leave/overtime approvals |
| HR / Admin | Full Core HR, attendance corrections, leave/OT/payroll setup, System Settings |
| Management | Everything, plus the Analytics dashboard and Reports |

Temporary employees are tracked for attendance/payroll/overtime but don't
get a login by default - `hasSelfServiceAccess` is a per-employee flag (set
via Employees → an employee → Account) rather than being hardcoded to
employment type, so it can be turned on for a specific temporary employee
later if needed.
