const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { getSettings } = require('./settingsService');
const { daysInMonth, timeStringToMinutes } = require('../utils/dateUtils');

async function getOrCreateRun(month, year, createdById) {
  const existing = await prisma.payrollRun.findUnique({ where: { month_year: { month, year } } });
  if (existing) return existing;
  return prisma.payrollRun.create({ data: { month, year, createdById, status: 'DRAFT' } });
}

// Recomputes every active employee's payslip for a DRAFT run from scratch:
// attendance-based deductions, approved-and-unclaimed overtime, and any
// manual deductions already attached to this run.
async function calculateRun(month, year, createdById) {
  const run = await getOrCreateRun(month, year, createdById);
  if (run.status !== 'DRAFT') {
    throw new AppError(400, 'Only a DRAFT payroll run can be (re)calculated');
  }

  const settings = await getSettings();
  const totalDays = daysInMonth(year, month);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month - 1, totalDays));

  const shiftMinutes = timeStringToMinutes(settings.shiftEnd) - timeStringToMinutes(settings.shiftStart);
  const hoursPerDay = Math.max(shiftMinutes, 60) / 60;

  const employees = await prisma.employee.findMany({
    where: { employmentStatus: 'ACTIVE', salaryStructure: { isNot: null } },
    include: { salaryStructure: { include: { allowances: true } } },
  });

  for (const employee of employees) {
    const basicSalary = employee.salaryStructure.basicSalary;
    const totalAllowances = employee.salaryStructure.allowances.reduce((s, a) => s + a.amount, 0);
    const grossSalary = basicSalary + totalAllowances;
    const perDaySalary = grossSalary / totalDays;
    const hourlyRate = perDaySalary / hoursPerDay;

    const attendance = await prisma.attendanceRecord.findMany({
      where: { employeeId: employee.id, date: { gte: from, lte: to } },
    });
    const absentDays = attendance.filter((a) => a.status === 'ABSENT').length + 0.5 * attendance.filter((a) => a.status === 'HALF_DAY').length;
    const unpaidDeduction = perDaySalary * absentDays;
    const payableDays = totalDays - absentDays;

    const overtimeRecords = await prisma.overtimeRecord.findMany({
      where: { employeeId: employee.id, status: 'APPROVED', date: { gte: from, lte: to }, payrollRunId: null },
    });
    let overtimeHours = overtimeRecords.reduce((s, r) => s + r.hours, 0);
    overtimeHours = Math.min(overtimeHours, settings.otMonthlyCapHours);
    const overtimePayWeighted = overtimeRecords.reduce((s, r) => s + Math.min(r.hours, settings.otMonthlyCapHours) * r.rateMultiplier, 0);
    const overtimePay = overtimePayWeighted * hourlyRate;

    const manualDeductionRows = await prisma.manualDeduction.findMany({
      where: { employeeId: employee.id, payrollRunId: run.id },
    });
    const manualDeductions = manualDeductionRows.reduce((s, d) => s + d.amount, 0);

    const netPay = grossSalary - unpaidDeduction + overtimePay - manualDeductions;

    await prisma.payslip.upsert({
      where: { payrollRunId_employeeId: { payrollRunId: run.id, employeeId: employee.id } },
      create: {
        payrollRunId: run.id,
        employeeId: employee.id,
        basicSalary,
        totalAllowances,
        grossSalary,
        payableDays,
        totalDays,
        unpaidDeduction,
        overtimeHours,
        overtimePay,
        manualDeductions,
        netPay,
      },
      update: { basicSalary, totalAllowances, grossSalary, payableDays, totalDays, unpaidDeduction, overtimeHours, overtimePay, manualDeductions, netPay },
    });

    await prisma.overtimeRecord.updateMany({
      where: { id: { in: overtimeRecords.map((r) => r.id) } },
      data: { payrollRunId: run.id },
    });
  }

  return prisma.payrollRun.findUnique({
    where: { id: run.id },
    include: { payslips: { include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } } } },
  });
}

module.exports = { getOrCreateRun, calculateRun };
