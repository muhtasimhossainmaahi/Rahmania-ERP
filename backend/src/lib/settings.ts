import { prisma } from "../config/db";

export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { settingKey: key } });
  return setting?.settingValue ?? null;
}

export async function upsertSetting(
  key: string,
  value: string,
  dataType: string,
  updatedBy: string,
) {
  return prisma.setting.upsert({
    where: { settingKey: key },
    create: { settingKey: key, settingValue: value, dataType, updatedBy },
    update: { settingValue: value, dataType, updatedBy },
  });
}

export type DuplicatePassportMode = "BLOCK" | "WARN";

const DUPLICATE_PASSPORT_MODE_KEY = "candidate.duplicate_passport_mode";

// SRS 21: "Warn/block duplicate passport numbers" based on admin config.
// Defaults to BLOCK (the safer option) when the admin hasn't set anything.
export async function getDuplicatePassportMode(): Promise<DuplicatePassportMode> {
  const value = await getSetting(DUPLICATE_PASSPORT_MODE_KEY);
  return value === "WARN" ? "WARN" : "BLOCK";
}

export async function setDuplicatePassportMode(mode: DuplicatePassportMode, updatedBy: string) {
  return upsertSetting(DUPLICATE_PASSPORT_MODE_KEY, mode, "enum", updatedBy);
}

const PASSPORT_CUSTODY_OVERDUE_DAYS_KEY = "passport.custody_overdue_days";
const DEFAULT_PASSPORT_CUSTODY_OVERDUE_DAYS = 3;

// SRS 8.7: "Flag overdue custody" — no threshold is specified, so it's
// admin-configurable via the same Setting-table pattern as the
// duplicate-passport mode, defaulting to 3 days unacknowledged.
export async function getPassportCustodyOverdueDays(): Promise<number> {
  const value = await getSetting(PASSPORT_CUSTODY_OVERDUE_DAYS_KEY);
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PASSPORT_CUSTODY_OVERDUE_DAYS;
}

export async function setPassportCustodyOverdueDays(days: number, updatedBy: string) {
  return upsertSetting(PASSPORT_CUSTODY_OVERDUE_DAYS_KEY, String(days), "number", updatedBy);
}
