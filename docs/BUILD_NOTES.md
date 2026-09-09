# Build Notes — Open Items

Tracks simplifications, deferrals, and judgment calls made while building
against `docs/SRS.md`, so they don't just live in chat history. Each item
names the spec section it relates to, what's actually implemented today,
and what closing it out would require. Update this file when an item is
resolved (move it to "Resolved" with the commit/date) or when a new one
is flagged.

## Open

### 1. Ready-to-Depart prerequisite gate is not implemented yet
- **Spec**: SRS 15 — "Ready to Depart must check mandatory prerequisites:
  valid passport, required visa, medical fit, required police clearance,
  BMET/manpower clearance, contract and ticket."
- **Current state**: `TICKETING → READY_TO_DEPART` in
  `candidateStatus.ts` is a plain standard transition with no validation
  at all. Any of the five prerequisite modules (Visa, Medical, Police
  Clearance, BMET, Contract) plus Ticket don't exist yet, so the check
  can't be written.
- **To close**: when building the Ticket/Departure module (build-order
  step 15), the transition into `READY_TO_DEPART` must verify all six:
  valid (non-expired) passport, an approved/received Visa record, a Fit
  Medical record, a Received Police Clearance, a cleared BMET record, a
  signed Contract, and a Ticket — not just Ticket completion. An
  authorized override (Super Admin/Management + mandatory reason, same
  pattern as the existing status-override mechanism) should still be
  available per SRS 15's "any override... requires authorized management
  permission and a mandatory reason."

### 2. DocumentType has no CRUD module
- **Spec**: SRS 8.6 / S23 — document types configurable by
  country/company/position; managed from the Settings screen.
- **Current state**: schema-only since step 1. The CandidateDocument
  module (Document Center) reads existing `DocumentType` rows but there's
  no API to create/update/deactivate one — the test data for that module
  was inserted directly via SQL.
- **To close**: a small CRUD module matching the Country/Department
  pattern (mutations Super-Admin-only, read open to authenticated users),
  likely alongside the Settings module.

### 3. Medical Rep has no candidate-related access anywhere yet
- **Spec**: section 6 — "Medical Representative: Medical
  appointment/results/fit-card records; cannot alter unrelated
  recruitment statuses."
- **Current state**: Candidate and CandidateDocument modules both
  exclude `MEDICAL_REP` entirely from read access (deferred, noted
  explicitly in both modules' route comments).
- **To close**: when the Medical module is built, decide exactly what
  contextual candidate access Medical Rep needs (likely: read a
  candidate's identity/header fields when working their MedicalRecord,
  not broad Candidate browsing) and wire it through
  `assertCandidateAccess` or a narrower variant.

### 4. Company and Agent only support a single agreement file, not a full document set
- **Spec**: SRS 8.2 — "Attach company-level documents and agreements"
  (plural). Section 9's DB design table, however, only lists a single
  `agreement_file_id` column on both `companies` and `agents`.
- **Current state**: implemented literally per the DB design table — one
  optional `agreementFileId` each.
- **To close**: if the client actually wants a full document set per
  company/agent (versioned, multiple files, like CandidateDocument),
  that's a schema addition (a `CompanyDocument`/`AgentDocument` child
  table), not just new routes. Flagging since the functional text and
  the DB table disagree on cardinality.

### 5. Auth module doesn't cover password reset or MFA
- **Spec**: SRS 8.1 — "Login, logout, password reset and optional MFA."
- **Current state**: login/logout (via JWT expiry) and registration
  exist. No password-reset flow (e.g. emailed reset token) and no MFA of
  any kind.
- **To close**: password reset needs an email-sending capability, which
  isn't wired up anywhere yet (SRS explicitly puts email/SMS integration
  in a later phase — see SRS 8.15, 24). MFA would need a second factor
  (TOTP is the common low-effort choice) plus a `mfaEnabled`/secret field
  on `User`.

### 6. No dedicated session/device management
- **Spec**: SRS 8.1 — "Session/device/security logging."
- **Current state**: partially covered — every action's IP and user
  agent are captured in `AuditLog` via `AuditContext`. There's no "list
  my active sessions," device trust, or forced-logout capability.
- **To close**: would need a `Session` table (or a JWT-blacklist/refresh-
  token scheme, since JWTs can't be individually revoked as designed
  today) if the client wants users to see/revoke their own active
  sessions.

### 7. Demand recruitment progress isn't computed anywhere
- **Spec**: SRS 8.3 — "Show recruitment progress and shortage/excess
  against requirement."
- **Current state**: `DemandPosition.requiredQty` exists; nothing
  aggregates linked Candidate counts (e.g., by status) against it.
- **To close**: now that Candidate exists, this could be added directly
  to the Demand module (e.g. `GET /demands/:id` returning per-position
  progress) or deferred to the Reports/Dashboard build-order step — worth
  a decision either way rather than leaving it implicit.

### 8. Company dashboard aggregation not built
- **Spec**: SRS 8.2 — "Company dashboard showing demands, candidate
  pipeline, departures and financial status."
- **Current state**: not built. Depends on Demand + Candidate (both now
  exist) and Transaction/Invoice (not yet built).
- **To close**: belongs in the Reports/Dashboard build-order step, once
  Accounts (Transaction/Invoice) exists for the financial-status part.

### 9. Mobile number validation is minimal
- **Spec**: SRS 21 — "Validate mobile numbers by configured country
  rules."
- **Current state**: only a bare length check (`min(3)` in Zod) on every
  mobile field across Candidate/Company/Agent/User. No real per-country
  format rules, and no Setting drives this.
- **To close**: would need a per-country validation rule set (similar
  shape to the duplicate-passport-mode Setting) — deferred until a
  concrete country's rule is actually requested, to avoid guessing at a
  format.

### 10. Department-level access scoping is not implemented
- **Spec**: SRS 15 — "Employees may edit only modules permitted by their
  role and department."
- **Current state**: read as role-based module access (already covered
  by `requireRole` everywhere) rather than department-level row
  filtering. E.g., an Operations user in one department can currently
  see/edit candidates "owned" by another department's Operations staff.
- **To close**: would need department-scoped filtering analogous to the
  Agent-scoping pattern in `assertCandidateAccess`, if the client
  actually wants row-level department isolation rather than just
  module-level role gating. Flagging the interpretation rather than
  silently assuming it's out of scope.

### 11. Printable passport receipt / hand-over acknowledgement PDF
- **Spec**: SRS 8.7 — "Generate printable passport receipt/hand-over
  acknowledgement."
- **Current state**: the PassportMovement module has the underlying data
  (from/to, purpose, timestamps, an `acknowledgementFileId` slot for a
  scanned signed copy) but nothing generates an actual printable
  PDF/receipt document from it.
- **To close**: belongs with the Reports & Exports build-order step
  (SRS 8.16/S20 — Excel/PDF export), which is where the rest of the
  app's PDF-generation capability will land. Not a data-model gap, just
  a presentation layer not built yet.

### 12. Passport custody overdue threshold (3 days) needs sign-off from operations staff
- **Spec**: SRS 8.7 — "Flag overdue custody," no threshold given.
- **Current state**: defaults to 3 days unacknowledged
  (`passport.custody_overdue_days` in the `Setting` table), a value I
  picked as a reasonable placeholder — not something derived from
  Rahmania's actual process.
- **To close**: this is a real business parameter (how long is it
  acceptable for a passport to sit with a custodian before it's flagged
  as a problem), not a technical detail, and shouldn't ship as an
  assumed default. Needs confirmation from actual Rahmania operations
  staff on what the right threshold is — likely different for internal
  office handoffs vs. external stops like an embassy submission. Once
  confirmed, update via `PUT /settings/passport-custody-overdue-days`
  (no code change needed, just the value).

## Resolved

- **Duplicate-passport warn-or-block toggle** (SRS 21) — implemented via
  the `Setting` table (`candidate.duplicate_passport_mode`) and
  `PUT /settings/duplicate-passport-mode`. See the Candidate module and
  Settings module commits.
