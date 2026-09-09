export function normalizePassport(passportNo: string): string {
  return passportNo.trim().toUpperCase().replace(/\s+/g, "");
}
