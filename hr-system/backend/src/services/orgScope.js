const prisma = require('../lib/prisma');

// Direct reports only (v1: one level of management, matching the SRS role table).
async function getTeamEmployeeIds(managerEmployeeId) {
  const reports = await prisma.employee.findMany({
    where: { managerId: managerEmployeeId },
    select: { id: true },
  });
  return reports.map((r) => r.id);
}

// Resolves which employeeIds req.user may access for a given target employeeId.
// Throws via AppError-shaped rejection if not permitted; call sites decide what to do.
async function canAccessEmployee(user, targetEmployeeId) {
  if (user.role === 'HR_ADMIN' || user.role === 'MANAGEMENT') return true;
  if (user.employeeId === targetEmployeeId) return true;
  if (user.role === 'MANAGER') {
    const teamIds = await getTeamEmployeeIds(user.employeeId);
    return teamIds.includes(targetEmployeeId);
  }
  return false;
}

module.exports = { getTeamEmployeeIds, canAccessEmployee };
