# Software Requirements Specification — Rahmania ERP

## 1. Overview
Cloud-based ERP system for Rahmania Corporation, accessible via web browser, hosted on cloud infrastructure with multi-user, role-based access.

## 2. Scope
Centralize core business operations: finance, inventory, sales, purchasing, HR, and reporting, replacing manual/spreadsheet-based workflows.

## 3. Modules

### 3.1 Authentication & Access Control
- Cloud-hosted login (email/password, optional 2FA)
- Role-based access (Admin, Manager, Accountant, Sales, Warehouse, Employee)
- Audit log of user actions

### 3.2 Finance & Accounting
- General ledger, accounts payable/receivable
- Invoicing and payment tracking
- Multi-currency support
- Financial reports (P&L, balance sheet, cash flow)

### 3.3 Inventory Management
- Stock tracking across multiple warehouses/locations
- Reorder-level alerts
- Barcode/SKU support
- Stock adjustment and transfer history

### 3.4 Sales & Purchasing
- Sales order and quotation management
- Purchase order management
- Supplier and customer database
- Approval workflows

### 3.5 Human Resources
- Employee records
- Attendance and leave management
- Payroll processing

### 3.6 Reporting & Dashboard
- Real-time dashboards per role
- Exportable reports (PDF/Excel)
- Custom date-range filtering

## 4. Non-Functional Requirements
- **Hosting**: Cloud-based (SaaS), accessible from any browser/device
- **Availability**: 99.5%+ uptime target
- **Security**: Encrypted data at rest and in transit, role-based permissions
- **Scalability**: Support growth in users, transactions, and data volume
- **Backup**: Automated daily backups with restore capability
- **Performance**: Page load under 3 seconds for standard operations

## 5. Technology Considerations
- Web application (responsive, browser-based)
- Cloud database with regular automated backups
- API-ready architecture for future integrations (payment gateways, SMS/email notifications)

## 6. Out of Scope (Phase 1)
- Native mobile apps
- Third-party marketplace integrations
- Multi-company/multi-tenant support
