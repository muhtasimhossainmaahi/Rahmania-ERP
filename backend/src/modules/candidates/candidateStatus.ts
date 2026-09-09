import { CandidateStatus } from "@prisma/client";

// Encodes the SRS section 14 flowchart plus its exception paths. ON_HOLD,
// CANCELLED and WITHDRAWN are reachable from most active stages (universal
// pause/stop points); the stage-specific *_REJECTED / *_UNFIT / *_ISSUE
// statuses loop back into reprocessing at the stage they came from, per
// section 14's "Rejected -> REPROCESS/CANCEL" style branches. Anything not
// listed here still isn't blocked outright — it just requires the
// Super Admin/Management override + mandatory-reason path in
// candidate.service.ts, matching section 15's rule for overriding a
// mandatory prerequisite.
export const CANDIDATE_STATUS_TRANSITIONS: Record<CandidateStatus, CandidateStatus[]> = {
  SOURCED: [
    CandidateStatus.REGISTERED,
    CandidateStatus.ON_HOLD,
    CandidateStatus.REJECTED,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  REGISTERED: [
    CandidateStatus.DOCUMENT_VERIFICATION,
    CandidateStatus.PASSPORT_ISSUE,
    CandidateStatus.ON_HOLD,
    CandidateStatus.REJECTED,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  DOCUMENT_VERIFICATION: [
    CandidateStatus.CV_READY,
    CandidateStatus.DOCUMENT_REJECTED,
    CandidateStatus.PASSPORT_ISSUE,
    CandidateStatus.ON_HOLD,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  DOCUMENT_REJECTED: [
    CandidateStatus.DOCUMENT_VERIFICATION,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  PASSPORT_ISSUE: [
    CandidateStatus.REGISTERED,
    CandidateStatus.DOCUMENT_VERIFICATION,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  CV_READY: [
    CandidateStatus.SHORTLISTED,
    CandidateStatus.ON_HOLD,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  SHORTLISTED: [
    CandidateStatus.INTERVIEW,
    CandidateStatus.REJECTED,
    CandidateStatus.ON_HOLD,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  INTERVIEW: [
    CandidateStatus.SELECTED,
    CandidateStatus.REJECTED,
    CandidateStatus.ON_HOLD,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  SELECTED: [
    CandidateStatus.CONTRACT,
    CandidateStatus.REJECTED,
    CandidateStatus.ON_HOLD,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  CONTRACT: [
    CandidateStatus.VISA_PROCESSING,
    CandidateStatus.ON_HOLD,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  VISA_PROCESSING: [
    CandidateStatus.VISA_RECEIVED,
    CandidateStatus.VISA_REJECTED,
    CandidateStatus.ON_HOLD,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  VISA_REJECTED: [
    CandidateStatus.VISA_PROCESSING,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  VISA_RECEIVED: [
    CandidateStatus.MOFA_EMBASSY,
    CandidateStatus.ON_HOLD,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  MOFA_EMBASSY: [
    CandidateStatus.MEDICAL,
    CandidateStatus.ON_HOLD,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  MEDICAL: [
    CandidateStatus.POLICE_CLEARANCE,
    CandidateStatus.MEDICAL_UNFIT,
    CandidateStatus.ON_HOLD,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  MEDICAL_UNFIT: [
    CandidateStatus.MEDICAL,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  POLICE_CLEARANCE: [
    CandidateStatus.BMET_MANPOWER,
    CandidateStatus.ON_HOLD,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  BMET_MANPOWER: [
    CandidateStatus.TICKETING,
    CandidateStatus.BMET_REJECTED,
    CandidateStatus.ON_HOLD,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  BMET_REJECTED: [
    CandidateStatus.BMET_MANPOWER,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  TICKETING: [
    CandidateStatus.READY_TO_DEPART,
    CandidateStatus.ON_HOLD,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  READY_TO_DEPART: [CandidateStatus.DEPARTED, CandidateStatus.ON_HOLD, CandidateStatus.CANCELLED],
  DEPARTED: [],
  ON_HOLD: [
    CandidateStatus.SOURCED,
    CandidateStatus.REGISTERED,
    CandidateStatus.DOCUMENT_VERIFICATION,
    CandidateStatus.CV_READY,
    CandidateStatus.SHORTLISTED,
    CandidateStatus.INTERVIEW,
    CandidateStatus.SELECTED,
    CandidateStatus.CONTRACT,
    CandidateStatus.VISA_PROCESSING,
    CandidateStatus.VISA_RECEIVED,
    CandidateStatus.MOFA_EMBASSY,
    CandidateStatus.MEDICAL,
    CandidateStatus.POLICE_CLEARANCE,
    CandidateStatus.BMET_MANPOWER,
    CandidateStatus.TICKETING,
    CandidateStatus.READY_TO_DEPART,
    CandidateStatus.CANCELLED,
    CandidateStatus.WITHDRAWN,
  ],
  REJECTED: [],
  CANCELLED: [],
  WITHDRAWN: [],
};

export function isStandardTransition(from: CandidateStatus, to: CandidateStatus): boolean {
  return CANDIDATE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
