const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');

// Verifies the JWT and attaches the acting user (with linked employee id,
// if any) to req.user. Every route below /api except /api/auth/login goes
// through this.
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Missing or invalid Authorization header');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new AppError(401, 'Invalid or expired token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { employee: { select: { id: true, managerId: true, employmentStatus: true } } },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'Account is not active');
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    employeeId: user.employee ? user.employee.id : null,
    managerOfEmployeeId: user.employee ? user.employee.id : null,
  };

  next();
}

// Restricts a route to one or more roles, e.g. authorize('HR_ADMIN', 'MANAGEMENT').
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, 'You do not have permission to perform this action');
    }
    next();
  };
}

module.exports = { authenticate, authorize };
