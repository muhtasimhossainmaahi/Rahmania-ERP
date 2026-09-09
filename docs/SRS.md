# RAHMANIA CORPORATION

## SOFTWARE REQUIREMENTS SPECIFICATION

Recruitment & Manpower Management System

- Version: 1.0
- Status: Development Specification
- Prepared for: Rahmania Corporation
- Date: 09 September 2026

## 1. Document Control

| Item | Specification |
|---|---|
| Document | Software Requirements Specification (SRS) |
| System | Rahmania Recruitment & Manpower Management System (RMS) |
| Version | 1.0 |
| Primary Objective | Centralize and control the full manpower recruitment lifecycle from demand creation to candidate departure. |
| Primary Users | Management, Operations, Marketing, Embassy, Manpower, Accounts, Agents, System Administrator |
| Target Platform | Responsive web application; API-first architecture recommended |
| Future Extensions | Mobile app, WhatsApp/SMS, client portal, agent portal, BI/analytics |

## 2. Executive Summary

Rahmania Corporation requires a centralized recruitment management platform that connects employers/clients, job demands, agents, candidates, documents, interviews, visa/MOFA, medical, police clearance, BMET/manpower clearance, ticketing and departure. (Finance & Accounting is explicitly excluded — see 4.2/8.14.)

The system must provide a single source of truth. Every candidate must have a unique Candidate ID and every recruitment project must have a unique Demand/Job ID. All activities, documents, status changes and assignments must remain linked and auditable.

The core management principle is: management must be able to open one candidate, one demand, or one company and immediately understand its current status, pending actions, responsible person, history and risk.

## 3. Business Objectives

- Eliminate fragmented Excel/WhatsApp/manual tracking.
- Track every candidate from sourcing through departure.
- Prevent passport/document loss through movement and audit tracking.
- Give management real-time company-wise, demand-wise and department-wise visibility.
- Automatically identify pending steps, overdue tasks and document expiries.
- Measure employee, agent and recruitment campaign performance.
- Maintain a permanent audit trail of important actions and status changes.
- Generate operational reports without manual consolidation. (Financial reporting is out of scope — see 4.2/8.14.)

## 4. Scope

### 4.1 In Scope

- Authentication and role-based access
- Dashboard and KPI reporting
- Company/client management
- Job/demand management
- Candidate registration and lifecycle
- Agent management
- Document management
- Interview and trade test management
- Visa and MOFA/Embassy tracking
- Medical tracking
- Police clearance
- BMET/manpower clearance
- Passport custody/movement
- Ticket and departure
- Tasks and notifications
- ~~Accounts and transactions~~ — **descoped, see 4.2 and 8.14**
- Reports and exports
- Audit logs
- System configuration

### 4.2 Out of Scope for MVP

- Direct government-system integration unless API access is officially available
- Full accounting/ERP replacement
- **Finance & Accounting, permanently** — candidate receipts/dues, agent
  commissions/payables, client invoices/receivables, expenses, transaction
  history, and any financial reporting. Confirmed out of scope entirely —
  not deferred to a later phase, not a future enhancement. No Transaction,
  Invoice, or other financial-ledger module will be built. See the former
  section 8.14, now marked descoped, and `docs/BUILD_NOTES.md` for the
  resulting status of the Accounts role.
- Payroll for overseas workers
- AI decision-making for candidate selection
- Automatic visa approval prediction

## 5. Core End-to-End Workflow

The system workflow is:

**CLIENT DEMAND → JOB CREATION → CANDIDATE SOURCING → REGISTRATION → DOCUMENT VERIFICATION → CV → SHORTLIST → INTERVIEW/TRADE TEST → SELECTION → CONTRACT → VISA → MOFA/EMBASSY → MEDICAL → POLICE CLEARANCE → BMET/MANPOWER → TICKET → READY TO DEPART → DEPARTED**

Exception paths: Rejected, On Hold, Cancelled, Visa Rejected, Medical Unfit, Passport Issue, Document Rejected, BMET Rejected, Withdrawn.

## 6. User Roles & Permissions

| Role | Main Permissions |
|---|---|
| Super Admin | Full system access, users, roles, settings, master data, audit logs. |
| Management / COO | All operational data, dashboards, approvals, reports, audit history; normally no destructive deletion. |
| Operations | Candidates, documents, status tracking, CV, tasks, reports, passport custody. |
| Marketing | Candidate sourcing, agent records, job matching, campaign/interview scheduling; no confidential admin records unless granted. |
| Embassy | Visa, MOFA, Tasheer/appointment and embassy processing; candidate read access as needed. |
| Manpower | Contracts, BMET, manpower clearance, departure readiness. |
| Accounts | ~~Candidate receipts, agent payable/commission, client invoices/receivables, expenses and financial reports.~~ **Descoped — see 4.2/8.14.** This role currently has no functional module; it retains its existing Edit rights on Candidates/Documents (section 7) but has no Finance & Accounting feature behind it. |
| Medical Representative | Medical appointment/results/fit-card records; cannot alter unrelated recruitment statuses. |
| Agent | Own submitted candidates, required documents, interview information and permitted status view. |
| Viewer / Auditor | Read-only access to approved screens and reports. |

## 7. Permission Matrix

| Module | Admin | Mgmt | Ops | Marketing | Embassy | Manpower | Accounts | Viewer |
|---|---|---|---|---|---|---|---|---|
| Dashboard | R | R | R | R | R | R | R | R |
| Candidates | F | E | E | R | R | R | E | R |
| Documents | F | E | E | R | R | R | E | R |
| Jobs/Demands | F | E | E | R | R | R | R | R |
| Companies | F | E | E | R | R | R | R | R |
| Agents | F | E | E | R | R | R | R | R |
| Interview | F | E | E | R | R | R | R | R |
| Visa/MOFA | F | R | R | E | R | R | R | R |
| Medical | F | R | R | R | E | R | R | R |
| BMET/Manpower | F | R | R | R | R | E | R | R |
| ~~Accounts~~ | — | — | — | — | — | — | — | — |
| Reports | F | E | E | E | E | E | E | R |
| Users/Settings | F | N | N | N | N | N | N | N |
| Audit Logs | F | R | R | R | R | R | R | R |

Legend: F = Full control; E = Create/Edit within role; R = Read-only; N = No access. Exact field-level restrictions must be enforced by backend authorization, not only hidden UI buttons.

The struck-through **Accounts** module row above is the descoped Finance
& Accounting module (see 4.2/8.14) — not to be confused with the
**Accounts** role column, which still stands as written (e.g. Edit on
Candidates/Documents) since that reflects the role's rights over
recruitment records already implemented in the system, independent of
the removed financial module.

## 8. Functional Requirements

### 8.1 Authentication & User Management

- Login, logout, password reset and optional MFA.
- Role-based and permission-based authorization.
- User activation/deactivation without deleting historical records.
- Department, designation and reporting manager.
- Session/device/security logging.

### 8.2 Company / Client Management

- Create client/employer profile with country, address, contacts, registration/license and agreements.
- Company dashboard showing demands, candidate pipeline and departures.
- Attach company-level documents and agreements.
- Maintain active/inactive status.

### 8.3 Job / Demand Management

- Create a Demand/Job ID with company, country, position, quantity, salary, benefits, accommodation, food, hours, contract terms and deadline.
- Track required, sourced, interviewed, selected, visa, medical, BMET and departed quantities.
- Allow multiple positions under one demand.
- Show recruitment progress and shortage/excess against requirement.

### 8.4 Candidate Management

- Unique Candidate ID.
- Store identity, passport, contact, profession, experience, source, agent, job/demand and company.
- Candidate profile must show current status, next action, assigned employee, documents and timeline.
- Search by name, passport, Candidate ID, mobile, agent, company, visa number and demand.

### 8.5 Candidate Lifecycle

- Controlled status transitions with permission checks.
- Every status change records old value, new value, user, timestamp and remarks.
- System calculates/flags the next required stage.
- Support exception statuses including Hold, Rejected, Cancelled, Unfit, Visa Rejected and Withdrawn.

### 8.6 Document Management

- Upload, preview, download, verify, reject and archive documents.
- Document types configurable by country/company/position.
- Record issue date, expiry date, status, uploader and verification user.
- Prevent unauthorized permanent deletion; use archive/soft delete.
- Optional document versioning.

### 8.7 Passport Custody & Movement

- Record passport receipt and current custodian.
- Every transfer records from, to, date/time, purpose, acknowledgement and remarks.
- Show current passport location prominently on candidate profile.
- Generate printable passport receipt/hand-over acknowledgement.
- Flag overdue custody.

### 8.8 Interview / Trade Test

- Create recruitment event with date, venue, company, positions and capacity.
- Assign serial numbers and candidates.
- Record interviewer/trade tester and result.
- Allow Selected, Rejected, Hold, Second Interview and No Show.
- Generate attendance/result sheets.

### 8.9 Visa & MOFA / Embassy

- Visa number, type, issue/expiry, profession, sponsor, copy and status.
- Track MOFA, appointment/Tasheer, embassy submission and passport collection.
- Every processing step has date, responsible employee and remarks.
- Alert on visa expiry and pending cases.

### 8.10 Medical

- Medical center, appointment, examination date, result, fit date, fit-card copy and expiry.
- Statuses: Pending, Appointment, Under Process, Fit, Unfit, Retest.
- Medical changes must be audited.

### 8.11 Police Clearance

- Track requirement, application, submission, issue date, expiry and document.
- Statuses: Pending, Submitted, Received, Rejected, Expired, Not Required.

### 8.12 BMET / Manpower

- Track contract, BMET registration, clearance, smart card and manpower clearance.
- Record submission/completion/rejection dates and documents.
- Prevent Ready-to-Depart status until configured mandatory prerequisites are complete.

### 8.13 Ticket & Departure

- Airline, PNR, ticket number, flight date/time, origin, destination and ticket copy.
- Departure checklist.
- Mark Ready to Depart only when mandatory conditions are satisfied or an authorized manager overrides with reason.
- Record actual departure and final deployment information.

### 8.14 Accounts — DESCOPED

**Finance & Accounting is permanently out of scope for this system —
confirmed, not deferred, removed.** No Transaction, Invoice, or other
financial-ledger module will be built, and no financial reporting exists
or will exist anywhere in the system. The bullets below are struck out
to preserve the original requirement text for reference only; none of
them will be implemented.

- ~~Candidate receipts and dues.~~
- ~~Agent commissions/payables.~~
- ~~Client invoices and receivables.~~
- ~~Expenses, adjustments and refunds.~~
- ~~Transaction history linked to candidate, agent, company and demand.~~
- ~~Financial permissions restricted by role.~~

The Accounts role (section 6) has no functional module behind it as a
result. See `docs/BUILD_NOTES.md` for its status — pending a later
decision on whether to remove it from the Role enum or leave it inert.

### 8.15 Tasks & Notifications

- Create and assign tasks to departments/employees.
- Priority, deadline, status and remarks.
- Overdue alerts.
- Dashboard notifications.
- Optional email/SMS/WhatsApp integration in later phase.

### 8.16 Reports & Analytics

- Daily, monthly, company-wise, demand-wise, agent-wise and employee-wise reports.
- Pipeline conversion and bottleneck analysis.
- ~~Financial reports.~~ — descoped along with 8.14; no financial data
  exists to report on.
- Export filtered results to Excel/PDF.
- Saved report filters for management.

### 8.17 Audit Logs

- Record login, create, edit, status change, upload, archive and permission changes.
- Store user, timestamp, entity, record ID, action, before/after values and IP/device where legally appropriate.
- Audit records should be immutable to ordinary users.

## 9. Database Design

Recommended relational database: PostgreSQL or MySQL. Use UUID or BIGINT primary keys internally and human-readable business IDs such as RC-CAN-000001 and DEM-2026-0001.

| Table | Core Fields |
|---|---|
| users | id, employee_id, name, email, mobile, password_hash, role_id, department_id, status, last_login_at, created_at, updated_at |
| roles | id, name, description, status |
| permissions | id, module, action, description |
| role_permissions | role_id, permission_id |
| departments | id, name, status |
| employees | id, employee_code, name, department_id, designation, mobile, email, manager_id, status |
| companies | id, company_code, name, country_id, address, contact_person, phone, email, registration_no, agreement_file_id, status |
| countries | id, name, code, status |
| demands | id, demand_no, company_id, country_id, title, received_date, deadline, status, notes |
| demand_positions | id, demand_id, position, required_qty, salary, currency, accommodation, food, working_hours, benefits, status |
| agents | id, agent_code, name, organization, contact_person, mobile, email, address, commission_terms, agreement_file_id, status |
| candidates | id, candidate_code, full_name, father_name, dob, gender, marital_status, mobile, alt_mobile, address, passport_no, passport_issue, passport_expiry, profession, experience_years, education, source, agent_id, demand_id, position_id, assigned_employee_id, current_status, created_at, updated_at |
| candidate_status_history | id, candidate_id, old_status, new_status, changed_by, changed_at, remarks |
| candidate_documents | id, candidate_id, document_type_id, file_path, file_name, version, issue_date, expiry_date, status, uploaded_by, verified_by, verified_at, remarks |
| document_types | id, name, country_id, mandatory_flag, expiry_required, status |
| passport_movements | id, candidate_id, from_user_id, to_user_id, from_location, to_location, handed_at, received_at, purpose, acknowledgement_file, remarks |
| interview_events | id, event_code, company_id, demand_id, event_date, venue, start_time, end_time, interviewer, status |
| interview_candidates | id, event_id, candidate_id, serial_no, attendance, result, score, remarks |
| contracts | id, candidate_id, contract_no, contract_date, salary, currency, duration, file_id, signed_date, status |
| visas | id, candidate_id, visa_no, visa_type, sponsor, issue_date, expiry_date, status, file_id, remarks |
| mofa_records | id, candidate_id, mofa_no, submission_date, approval_date, status, file_id, remarks |
| embassy_records | id, candidate_id, appointment_date, submission_date, collection_date, status, file_id, remarks |
| medical_records | id, candidate_id, center, appointment_date, exam_date, result, fit_date, expiry_date, fit_card_file_id, status, remarks |
| police_clearances | id, candidate_id, application_date, submission_date, issue_date, expiry_date, status, file_id, remarks |
| bmet_records | id, candidate_id, contract_status, registration_no, submission_date, clearance_date, smart_card_no, status, file_id, remarks |
| tickets | id, candidate_id, airline, pnr, ticket_no, flight_no, departure_datetime, origin, destination, file_id, status |
| departures | id, candidate_id, departure_date, airport, destination, actual_departure, deployment_status, remarks |
| tasks | id, task_no, title, candidate_id, demand_id, department_id, assigned_to, priority, due_date, status, created_by, completed_at, remarks |
| ~~transactions~~ | **descoped — see 4.2/8.14, not implemented** |
| ~~invoices~~ | **descoped — see 4.2/8.14, not implemented** |
| notifications | id, user_id, type, title, message, entity_type, entity_id, read_at, created_at |
| audit_logs | id, user_id, entity_type, entity_id, action, before_json, after_json, ip_address, user_agent, created_at |
| file_registry | id, storage_key, original_name, mime_type, size, checksum, uploaded_by, created_at, archived_at |
| settings | id, setting_key, setting_value, data_type, updated_by, updated_at |

## 10. Key Relationships

- One Company → Many Demands.
- One Demand → Many Positions.
- One Demand Position → Many Candidates.
- One Agent → Many Candidates.
- One Candidate → Many Documents, Status History, Passport Movements and Tasks.
- One Candidate → Zero/One or Multiple visa/MOFA/medical/police/BMET records depending on workflow and reprocessing.
- One Interview Event → Many Candidates.
- One Demand → Many Candidate records.
- Every uploaded file must be referenced through file_registry; business tables should not store raw files.

## 11. Screen-by-Screen Requirements

| ID | Screen | Requirements |
|---|---|---|
| S01 | Login | Email/mobile, password, remember device, forgot password, MFA if enabled. |
| S02 | Main Dashboard | KPI cards, pipeline, overdue tasks, alerts, company/demand filters, charts, quick actions. |
| S03 | Candidate List | Search, filters, bulk actions, status, agent, company, demand, assigned employee, export. |
| S04 | Candidate Profile | Identity, recruitment summary, current status, next action, documents, timeline, passport custody, visa, medical, BMET. |
| S05 | Candidate Registration | Basic data, passport, profession, agent/source, company/demand/position, duplicate check. |
| S06 | Document Center | Required document checklist, upload, preview, verify/reject, expiry, version history. |
| S07 | Passport Tracker | Current holder/location, movement history, receive/hand-over actions, printable receipt. |
| S08 | Companies | Company list, search, profile, contacts, documents, demands, candidate pipeline. |
| S09 | Demand List | Demand number, company, country, deadline, required quantity, current pipeline, status. |
| S10 | Demand Detail | Positions, quotas, candidate pipeline, progress bar, shortage, interview events, reports. |
| S11 | Agent Management | Agent profile, candidates, performance, commission terms (display only — no payable tracking, see 4.2), documents. |
| S12 | Interview/Event | Create event, assign candidates, serials, attendance, results, print sheets. |
| S13 | Visa/MOFA | Queue of cases, filters, status update, document upload, expiry alerts. |
| S14 | Medical | Appointment queue, result entry, fit card upload, expiry alerts. |
| S15 | Police Clearance | Queue, submission/result, document and expiry tracking. |
| S16 | BMET/Manpower | Clearance queue, submission/completion, rejection reasons, documents. |
| S17 | Departure | Ready-to-depart checklist, ticket data, departure confirmation, final status. |
| S18 | Tasks | My tasks, department tasks, overdue, priority, assignment and completion. |
| S19 | ~~Accounts~~ | **Descoped — see 4.2/8.14.** Was: receipts, dues, invoices, agent payable, expenses, transactions and reports. |
| S20 | Reports | Report catalog, filters, saved views, Excel/PDF export. |
| S21 | Notifications | Unread alerts, deadlines, document expiry, overdue tasks. |
| S22 | Users & Roles | Users, departments, roles, permissions, activation/deactivation. |
| S23 | Settings | Countries, professions, document types, statuses, currencies, workflow rules. |
| S24 | Audit Logs | Searchable immutable activity history with before/after values. |

## 12. Candidate Profile Layout

The Candidate Profile should be the most important operational screen. Recommended tabs:

- Overview
- Personal & Passport
- Job/Demand
- Documents
- Interview
- Contract
- Visa
- MOFA/Embassy
- Medical
- Police Clearance
- BMET
- Passport Movement
- Ticket & Departure
- ~~Accounts~~ (descoped, see 4.2/8.14)
- Tasks
- Timeline
- Audit

A fixed header should always show Candidate ID, Name, Passport No., Position, Company, Agent, Current Status, Next Action, Assigned Employee and Passport Current Location.

## 13. Dashboard Requirements

- Top KPI cards: Total Active, Selected, Visa, Medical Pending, BMET Pending, Ready to Depart, Departed, Overdue.
- Company-wise pipeline.
- Demand quota versus actual recruitment.
- Department pending workload.
- Agent performance.
- Upcoming deadlines and expiries.
- Overdue tasks by employee.
- Recent critical activities.
- Filters: date range, company, country, demand, position, agent, department.

## 14. Complete Workflow / Flowchart

```
START
↓
CLIENT / EMPLOYER DEMAND RECEIVED
↓
CREATE COMPANY + DEMAND + POSITION
↓
SET RECRUITMENT TARGET & DEADLINE
↓
SOURCE CANDIDATES
↓
REGISTER CANDIDATE + DUPLICATE CHECK
↓
COLLECT & VERIFY DOCUMENTS
├── Missing/Invalid → TASK CREATED → Corrected → VERIFY AGAIN
↓
CV PREPARATION
↓
SHORTLIST
├── Rejected → CLOSED / ARCHIVED
↓
INTERVIEW / TRADE TEST
├── Rejected → CLOSED
├── Hold → TASK / FUTURE EVENT
↓
SELECTED
↓
CONTRACT / OFFER
├── Not completed → TASK / HOLD
↓
VISA PROCESSING
├── Rejected → REPROCESS / CANCEL
↓
VISA RECEIVED
↓
MOFA / TASHEER / EMBASSY
├── Issue → TASK / REPROCESS
↓
MEDICAL
├── Unfit → CLOSED / REPLACEMENT / REPROCESS
├── Retest → APPOINTMENT
↓
POLICE CLEARANCE
↓
BMET / MANPOWER CLEARANCE
├── Rejected → CORRECTION → RESUBMIT
↓
DEPARTURE CHECKLIST
↓
TICKET
↓
READY TO DEPART
↓
DEPARTED
↓
FINAL DEPLOYMENT RECORD
↓
END
```

## 15. Status & Business Rules

- Candidate cannot be marked Selected unless linked to a valid Demand Position.
- Duplicate passport numbers must trigger a warning/block based on admin configuration.
- Ready to Depart must check mandatory prerequisites: valid passport, required visa, medical fit, required police clearance, BMET/manpower clearance, contract and ticket.
- Any override of a mandatory prerequisite requires authorized management permission and a mandatory reason.
- Changing a candidate's current status must create a status-history record.
- Document expiry must generate configurable alerts, e.g. 30/15/7 days before expiry.
- Demand progress must be calculated automatically from linked candidates.
- Departed candidates become read-only for ordinary users except authorized post-deployment updates.
- ~~Financial transactions must never be hard-deleted; corrections use reversal/adjustment entries.~~ — moot, Finance & Accounting is descoped (4.2/8.14).
- Archived records remain searchable by authorized users.
- Agent users must never see another agent's candidates.
- Employees may edit only modules permitted by their role and department.

## 16. Notifications & Automation

| Trigger | System Action | Recipients |
|---|---|---|
| Document missing | Create pending task | Assigned Operations user |
| Document expiring | Alert at configured intervals | Candidate owner + Operations |
| Medical pending | Show queue + overdue alert | Medical/Operations |
| Visa received | Create next-stage task | Operations/Embassy |
| BMET completed | Mark departure readiness check | Manpower + Operations |
| Task overdue | Escalate notification | Assignee + Department Manager |
| Demand below target | Show shortage KPI | Management + Marketing |
| Passport overdue with custodian | Critical alert | Custodian + Operations Manager |
| Candidate marked Ready | Run prerequisite validation | Operations/Management |
| Departure completed | Close recruitment pipeline | Management (~~+ Accounts~~ — descoped, 4.2/8.14) |

## 17. Reporting Requirements

- Candidate Master Report
- Candidate Pipeline Report
- Company-wise Recruitment Report
- Demand/Position Progress Report
- Agent Performance Report
- Interview Result Report
- Visa Status Report
- Medical Status Report
- BMET Status Report
- Ready-to-Depart Report
- Departure Report
- Pending Documents Report
- Passport Custody Report
- Overdue Task Report
- Employee Performance Report
- ~~Candidate Collection Report~~ — descoped, financial (4.2/8.14)
- ~~Agent Payable Report~~ — descoped, financial (4.2/8.14)
- ~~Client Receivable Report~~ — descoped, financial (4.2/8.14)
- Monthly Management Report (operational content only — no financial section, per 4.2/8.14)

## 18. Non-Functional Requirements

- Security: server-side authorization, password hashing, HTTPS, secure file access and audit logging.
- Performance: normal list/search screens should target sub-2-second response under expected office load; heavy reports may use asynchronous generation.
- Scalability: design for at least 100,000 candidate records without redesign.
- Availability: automated daily database backup and tested restoration procedure.
- File Storage: use object storage or structured server storage with access control; never expose private files through guessable URLs.
- Data Integrity: foreign keys, unique passport constraints where applicable, transactions for multi-table updates.
- Auditability: important changes must be traceable to a user and timestamp.
- Responsive UI: desktop-first but usable on tablets/mobile browsers.
- Localization: English first; architecture should support Bangla later.
- Time zone: Bangladesh office time should be supported; timestamps stored consistently in UTC where practical.
- Export: Excel and PDF.
- API: REST/JSON or GraphQL with documented authentication and authorization.
- Deployment: production, staging and development environments should be separated.

## 19. Recommended Technical Architecture

| Layer | Recommendation |
|---|---|
| Frontend | React / Next.js or equivalent modern web framework |
| Backend | Node.js/NestJS, Laravel, Django or equivalent enterprise framework |
| Database | PostgreSQL preferred; MySQL acceptable |
| File Storage | S3-compatible object storage or secured server storage |
| Authentication | JWT/session-based authentication with RBAC; optional MFA |
| Background Jobs | Redis + queue worker or equivalent for reminders/reports |
| Notifications | In-app first; email/SMS/WhatsApp via provider APIs later |
| Deployment | Docker recommended; cloud or private server |
| Monitoring | Application logs, error tracking, uptime and backup monitoring |

## 20. API & Integration Requirements

- API endpoints for candidates, companies, demands, agents, documents, workflow stages, reports and users.
- Document upload API with file type/size validation and virus scanning where available.
- Webhook/event architecture for future WhatsApp/SMS/email notifications.
- Government integrations should be treated as separate adapters and only implemented where officially permitted and technically supported.
- All API endpoints must enforce server-side role/permission checks.

## 21. Data Validation & Duplicate Control

- Passport number should be normalized before comparison (trim spaces, uppercase where appropriate).
- Warn/block duplicate passport numbers.
- Validate date formats and passport expiry.
- Validate mobile numbers by configured country rules.
- Prevent duplicate company/demand records using business identifiers where applicable.
- Required fields must be configurable by country, company or recruitment type.

## 22. Development Phases

| Phase | Deliverables |
|---|---|
| Phase 1 – Foundation | Login/RBAC, dashboard, companies, agents, demands, candidates, search, documents, candidate timeline. |
| Phase 2 – Recruitment Operations | Interview, contract, visa, MOFA/Embassy, medical, police clearance, BMET, passport tracking. |
| Phase 3 – Completion & Management | Ticket/departure, tasks, notifications, reports, employee performance, audit. (Accounts descoped — see 4.2/8.14.) |
| Phase 4 – Automation | WhatsApp/SMS/email, advanced analytics, client/agent portals, mobile app, integrations. |

## 23. Acceptance Criteria

- A user with the wrong role cannot access restricted data through UI or direct API calls.
- Creating a candidate generates a unique Candidate ID.
- Passport duplicate detection works before final registration.
- Every candidate status change appears in the timeline and audit history.
- Management can filter a demand and see its full pipeline and shortage.
- Passport current location is visible and every handover is traceable.
- Mandatory document checklist is visible per candidate.
- Ready-to-Depart validation blocks incomplete candidates unless authorized override is used.
- Reports can be filtered and exported.
- Deleted/archived records remain auditable.
- System backups can be restored successfully in a test environment.
- All critical workflows can be completed without maintaining a parallel Excel master file.

## 24. Future Enhancements

- Agent portal with candidate submission.
- Employer/client portal for demand and candidate approval.
- Candidate portal/mobile app.
- WhatsApp Business integration for status notifications.
- OCR for passport/document data extraction.
- Barcode/QR passport tracking.
- Biometric/attendance integration for interview events.
- Advanced forecasting and recruitment analytics.
- Automated document naming and folder generation.
- Multi-country workflow templates.

## 25. Developer Deliverables

- UI/UX design and clickable prototype.
- Database ERD and migration scripts.
- Frontend source code.
- Backend/API source code.
- Authentication/RBAC implementation.
- Automated tests for critical workflows.
- API documentation.
- Deployment configuration.
- Backup and restore documentation.
- Administrator manual.
- User training materials.
- Production handover and source-code ownership documentation.

## 26. Final Product Principle

The system must not become another digital version of scattered spreadsheets. It must operate as a controlled workflow engine. Each record must have an owner, each pending action must have a next step, each important change must be auditable, and management must have real-time visibility from demand creation to final departure.

Recommended core identifiers: Company ID → Demand ID → Position ID → Candidate ID. All operational, document and workflow records should connect to these identifiers.
