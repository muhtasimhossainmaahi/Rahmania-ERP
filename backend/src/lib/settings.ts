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
