import { Candidate, CandidateStatus, MedicalStatus, PoliceClearanceStatus } from "@prisma/client";
import { prisma } from "../../config/db";

export interface PrerequisiteCheck {
  satisfied: boolean;
  missing: string[];
}

const SATISFIED: PrerequisiteCheck = { satisfied: true, missing: [] };

// SRS 15: "Candidate cannot be marked Selected unless linked to a valid
// Demand Position."
function checkSelectedPrerequisites(candidate: Candidate): PrerequisiteCheck {
  if (candidate.positionId) {
    return SATISFIED;
  }
  return { satisfied: false, missing: ["Demand Position link"] };
}

// SRS 15: "Ready to Depart must check mandatory prerequisites: valid
// passport, required visa, medical fit, required police clearance,
// BMET/manpower clearance, contract and ticket."
//
// Every reprocessing-based check reads only the CURRENT (isCurrent: true)
// record — a superseded historical attempt (e.g. a rejected visa that was
// later reprocessed) must never satisfy the gate.
//
// Visa/BmetRecord/Contract carry a free-text `status` field with no fixed
// vocabulary, so their completion is read off a structural date field
// instead (issueDate/clearanceDate/signedDate) rather than string-matching
// against a value nobody is required to spell consistently. Medical and
// Police Clearance already have real enums with an unambiguous "passed"
// value, so those are checked directly.
async function checkReadyToDepartPrerequisites(candidate: Candidate): Promise<PrerequisiteCheck> {
  const missing: string[] = [];
  const now = new Date();

  if (candidate.passportExpiry && candidate.passportExpiry <= now) {
    missing.push("valid (non-expired) passport");
  }

  const [visa, medical, police, bmet, contract, ticket] = await Promise.all([
    prisma.visa.findFirst({ where: { candidateId: candidate.id, isCurrent: true } }),
    prisma.medicalRecord.findFirst({ where: { candidateId: candidate.id, isCurrent: true } }),
    prisma.policeClearance.findFirst({ where: { candidateId: candidate.id, isCurrent: true } }),
    prisma.bmetRecord.findFirst({ where: { candidateId: candidate.id, isCurrent: true } }),
    prisma.contract.findUnique({ where: { candidateId: candidate.id } }),
    prisma.ticket.findUnique({ where: { candidateId: candidate.id } }),
  ]);

  if (!visa || !visa.issueDate || (visa.expiryDate !== null && visa.expiryDate <= now)) {
    missing.push("valid visa (issued, not expired)");
  }
  if (!medical || medical.status !== MedicalStatus.FIT) {
    missing.push("medical fitness (FIT)");
  }
  if (
    !police ||
    !(
      police.status === PoliceClearanceStatus.RECEIVED ||
      police.status === PoliceClearanceStatus.NOT_REQUIRED
    )
  ) {
    missing.push("police clearance (received or not required)");
  }
  if (!bmet || !bmet.clearanceDate) {
    missing.push("BMET/manpower clearance");
  }
  if (!contract || !contract.signedDate) {
    missing.push("signed contract");
  }
  if (!ticket || !ticket.ticketNo || !ticket.departureDatetime) {
    missing.push("ticket with flight details");
  }

  return missing.length === 0 ? SATISFIED : { satisfied: false, missing };
}

// Only SELECTED and READY_TO_DEPART have mandatory prerequisites beyond
// the status-transition graph itself (SRS 15). Extend this when a future
// stage gets its own mandatory prerequisite.
export async function checkMandatoryPrerequisites(
  targetStatus: CandidateStatus,
  candidate: Candidate,
): Promise<PrerequisiteCheck> {
  if (targetStatus === CandidateStatus.SELECTED) {
    return checkSelectedPrerequisites(candidate);
  }
  if (targetStatus === CandidateStatus.READY_TO_DEPART) {
    return checkReadyToDepartPrerequisites(candidate);
  }
  return SATISFIED;
}
