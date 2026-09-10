const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { UPLOAD_ROOT, publicUrl } = require('../middleware/upload');

function money(n) {
  return Number(n).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function generatePayslipPdf(payslip, employee, run) {
  const dir = path.join(UPLOAD_ROOT, 'payslips');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${payslip.id}.pdf`);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(18).text('Rahmania Corporation', { align: 'center' });
  doc.fontSize(12).text('Payslip', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Pay period: ${MONTH_NAMES[run.month - 1]} ${run.year}`, { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(11);
  doc.text(`Employee: ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`);
  if (employee.department) doc.text(`Department: ${employee.department.name}`);
  if (employee.designation) doc.text(`Designation: ${employee.designation.title}`);
  doc.moveDown();

  const rows = [
    ['Basic Salary', money(payslip.basicSalary)],
    ['Allowances', money(payslip.totalAllowances)],
    ['Gross Salary', money(payslip.grossSalary)],
    ['Payable Days', `${payslip.payableDays} / ${payslip.totalDays}`],
    ['Unpaid Deduction', `- ${money(payslip.unpaidDeduction)}`],
    ['Overtime Hours', `${payslip.overtimeHours}`],
    ['Overtime Pay', `+ ${money(payslip.overtimePay)}`],
    ['Manual Deductions', `- ${money(payslip.manualDeductions)}`],
  ];

  rows.forEach(([label, value]) => {
    doc.text(`${label}:`, { continued: true, width: 300 });
    doc.text(`  ${value}`, { align: 'right' });
  });

  doc.moveDown();
  doc.fontSize(13).text(`Net Pay: BDT ${money(payslip.netPay)}`, { align: 'right' });

  doc.moveDown(2);
  doc.fontSize(8).fillColor('gray').text('This is a system-generated payslip and does not require a signature.', { align: 'center' });

  doc.end();

  return { filePath, publicPath: publicUrl(filePath) };
}

module.exports = { generatePayslipPdf };
