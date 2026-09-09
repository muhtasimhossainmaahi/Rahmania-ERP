# Build Notes — Open Items

Tracks simplifications, deferrals, and judgment calls made while building
against `docs/SRS.md`, so they don't just live in chat history. Each item
names the spec section it relates to, what's actually implemented today,
and what closing it out would require. Update this file when an item is
resolved (move it to "Resolved" with the commit/date) or when a new one
is flagged.

## Open

### 1. DocumentType has no CRUD module
- **Spec**: SRS 8.6 / S23 — document types configurable by
  country/company/position; managed from the Settings screen.
- **Current state**: schema-only since step 1. The CandidateDocument
  module (Document Center) reads existing `DocumentType` rows but there's
  no API to create/update/deactivate one — the test data for that module
  was inserted directly via SQL.
- **To close**: a small CRUD module matching the Country/Department
  pattern (mutations Super-Admin-only, read open to authenticated users),
  likely alongside the Settings module.

### 2. Company and Agent only support a single agreement file, not a full document set
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

### 3. Auth module doesn't cover password reset or MFA
- **Spec**: SRS 8.1 — "Login, logout, password reset and optional MFA."
- **Current state**: login/logout (via JWT expiry) and registration
  exist. No password-reset flow (e.g. emailed reset token) and no MFA of
  any kind.
- **To close**: password reset needs an email-sending capability, which
  isn't wired up anywhere yet (SRS explicitly puts email/SMS integration
  in a later phase — see SRS 8.15, 24). MFA would need a second factor
  (TOTP is the common low-effort choice) plus a `mfaEnabled`/secret field
  on `User`.

### 4. No dedicated session/device management
- **Spec**: SRS 8.1 — "Session/device/security logging."
- **Current state**: partially covered — every action's IP and user
  agent are captured in `AuditLog` via `AuditContext`. There's no "list
  my active sessions," device trust, or forced-logout capability.
- **To close**: would need a `Session` table (or a JWT-blacklist/refresh-
  token scheme, since JWTs can't be individually revoked as designed
  today) if the client wants users to see/revoke their own active
  sessions.

### 5. Demand recruitment progress isn't computed anywhere
- **Spec**: SRS 8.3 — "Show recruitment progress and shortage/excess
  against requirement."
- **Current state**: `DemandPosition.requiredQty` exists; nothing
  aggregates linked Candidate counts (e.g., by status) against it.
- **To close**: now that Candidate exists, this could be added directly
  to the Demand module (e.g. `GET /demands/:id` returning per-position
  progress) or deferred to the Reports/Dashboard build-order step — worth
  a decision either way rather than leaving it implicit.

### 6. Company dashboard aggregation not built
- **Spec**: SRS 8.2 — "Company dashboard showing demands, candidate
  pipeline, departures and financial status."
- **Current state**: not built. Depends on Demand + Candidate (both now
  exist) and Transaction/Invoice (not yet built).
- **To close**: belongs in the Reports/Dashboard build-order step, once
  Accounts (Transaction/Invoice) exists for the financial-status part.

### 7. Mobile number validation is minimal
- **Spec**: SRS 21 — "Validate mobile numbers by configured country
  rules."
- **Current state**: only a bare length check (`min(3)` in Zod) on every
  mobile field across Candidate/Company/Agent/User. No real per-country
  format rules, and no Setting drives this.
- **To close**: would need a per-country validation rule set (similar
  shape to the duplicate-passport-mode Setting) — deferred until a
  concrete country's rule is actually requested, to avoid guessing at a
  format.

### 8. Department-level access scoping is not implemented
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

### 9. Printable passport receipt / hand-over acknowledgement PDF
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

### 10. Passport custody overdue threshold (3 days) needs sign-off from operations staff
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

### 11. Interview result vs. candidate status can silently drift out of sync
- **Spec**: SRS 8.5 — "System calculates/flags the next required stage."
- **Current state**: recording an InterviewCandidate result (e.g.
  SELECTED) does not touch the candidate's own `currentStatus` — they're
  independent fields, updated through separate endpoints
  (`PATCH /interview-events/:id/candidates/:entryId` vs.
  `PATCH /candidates/:id/status`). This was a deliberate choice (see the
  InterviewEvent module commit) to avoid guessing status mappings for
  Hold/Second Interview/No Show and to keep a single audited path for
  candidate status changes — but it means a candidate can sit with an
  interview result of SELECTED while `currentStatus` is still e.g.
  REGISTERED, with nothing surfacing that mismatch.
- **To close**: needs a real decision from Rahmania operations, not an
  assumption either way — this affects daily workflow (who's expected to
  notice and act on the drift). Two options on the table: (a) auto-sync
  candidate status when an unambiguous result (SELECTED/REJECTED) is
  recorded, or (b) keep them independent but surface a warning/flag
  wherever both are shown together (Candidate Profile, interview roster)
  when they disagree. Whichever is chosen, it should be a considered
  product decision, not something assumed in code.

### 12. InterviewCandidate removal is a hard delete, unlike Documents
- **Spec**: no explicit SRS rule for removing an interview assignment
  specifically, but SRS 8.6 and the general audit-trail principle
  (8.17) favor archive/soft-delete over permanent deletion elsewhere in
  the system (CandidateDocument, CandidateStatusHistory).
- **Current state**: `DELETE /interview-events/:id/candidates/:entryId`
  hard-deletes the row. The action is still audit-logged with the full
  prior row captured as `before`, so it's traceable in AuditLog, but the
  row itself is gone from `interview_candidates` — it won't show up in
  a query against that table directly, only in the audit log.
- **To close**: needs a decision on whether this should instead be a
  soft-delete (e.g. an `isActive`/archived flag, consistent with how
  CandidateDocument versions are archived rather than deleted) so the
  row stays queryable in place. Flagging for consistency review rather
  than assuming the current hard-delete is fine — it was a judgment
  call at the time (reasoning: a scheduling assignment felt less
  "record-like" than a document), but that reasoning wasn't validated
  against how the rest of the system treats removal.

### 13. Expiry alerting is not implemented for any expiry-bearing record
- **Spec**: SRS 15 — "Document expiry must generate configurable alerts,
  e.g. 30/15/7 days before expiry" (general rule, not module-specific);
  SRS 8.9 — "Alert on visa expiry and pending cases."
- **Current state**: expiry dates are tracked and queryable
  (`CandidateDocument.expiryDate`, `Candidate.passportExpiry`,
  `Visa.expiryDate`, and later `MedicalRecord`/`PoliceClearance`/
  `Contract` will have their own), but nothing generates an actual
  alert/notification as a date approaches. No Setting exists yet for the
  30/15/7-day thresholds either.
- **To close**: belongs with the Tasks & Notifications module (SRS
  8.15) — a scheduled job or query that scans all expiry-bearing tables
  and creates `Notification` rows (or `Task`s) for records crossing the
  configured thresholds. One general-purpose piece of work, not
  something to build per-module; this note exists so it isn't
  forgotten once Notifications is reached, given how many modules by
  then will have an expiry date sitting unused for this purpose.

## Resolved

- **Duplicate-passport warn-or-block toggle** (SRS 21) — implemented via
  the `Setting` table (`candidate.duplicate_passport_mode`) and
  `PUT /settings/duplicate-passport-mode`. See the Candidate module and
  Settings module commits.
- **Visa/MOFA role assignment** — section 7's permission matrix lists
  Visa/MOFA as Marketing=Edit, Embassy=Read, which contradicts section
  6's role narrative (Embassy's whole job is visa/MOFA/embassy
  processing; Marketing's narrative has no connection to it). Per
  explicit user decision, implemented as a transcription error and
  built per the narrative instead: mutation is Admin + Embassy,
  Marketing is read-only. Applies to Visa, MofaRecord, and
  EmbassyRecord (all three share the Visa/MOFA matrix row per SRS 8.9's
  grouping). If Rahmania confirms the matrix was actually correct as
  written, this needs to be reverted in all three modules' route files.
- **Medical Rep access + role assignment** (was open item 3) — section
  7's matrix gives Medical's edit right to Embassy, and `MEDICAL_REP`
  isn't a matrix column at all, even though section 6 defines it
  specifically for "Medical appointment/results/fit-card records."
  Per explicit user decision (same reasoning as the Agent precedent —
  a role whose sole stated purpose is this work shouldn't be excluded
  just because the matrix table has no column for it): mutation is
  Admin + Medical Rep, Embassy is read-only along with the other
  matrix-literal roles. Unlike Agent, Medical Rep is NOT scoped by
  candidate ownership — it's a functional department role covering
  all candidates in medical processing. MedicalRecord responses
  include a minimal candidate identity summary (id, candidateCode,
  fullName, passportNo) inline, since Medical Rep has no broader
  Candidate-browsing access to get that context otherwise. If Rahmania
  confirms the matrix was correct as written, revert
  `medicalRecord.routes.ts`'s MUTATE_ROLES to Admin + Embassy.
- **Ready-to-Depart prerequisite gate** (was open item 1) — implemented
  in `candidatePrerequisites.ts`, wired into `changeCandidateStatus`.
  Per explicit user decision: Visa/BmetRecord/Contract carry a free-text
  `status` with no fixed vocabulary, so their completion is read off a
  structural date field instead of string-matching — `issueDate` set and
  `expiryDate` null-or-future for Visa, `clearanceDate` set for
  BmetRecord, `signedDate` set for Contract. MedicalRecord and
  PoliceClearance already have real enums, so those are checked directly
  (`FIT`; `RECEIVED` or `NOT_REQUIRED`). Ticket requires `ticketNo` and
  `departureDatetime`. `Candidate.passportExpiry` must be null or future.
  Every reprocessing-based check (Visa/Medical/Police/BMET) reads only
  the `isCurrent: true` row — confirmed by test: a historically-valid
  Visa superseded by a currently-invalid one is correctly ignored, and
  the gate fails on visa alone. A missing prerequisite doesn't hard-block;
  it requires the same Super Admin/Management + mandatory-reason override
  mechanism as a non-standard status transition (SRS 15: "Any override of
  a mandatory prerequisite requires authorized management permission and
  a mandatory reason"), logged under a distinct audit action
  (`CANDIDATE_STATUS_CHANGED_PREREQUISITE_OVERRIDE`) recording which
  prerequisites were bypassed (`overriddenPrerequisites`) and why
  (`overrideReason`). The pre-existing SELECTED-requires-positionId check
  was folded into the same mechanism for consistency — it was previously
  an unconditional 400 with no override path, which didn't match SRS 15's
  "mandatory prerequisite" framing. See the Ticket/Departure module
  commit.
