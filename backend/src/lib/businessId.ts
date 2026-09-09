import { randomUUID } from "crypto";
import { prisma } from "../config/db";

export async function nextSequenceNumber(key: string): Promise<number> {
  const id = randomUUID();
  const result = await prisma.$queryRaw<{ value: string }[]>`
    INSERT INTO settings (id, setting_key, setting_value, data_type, updated_by, updated_at)
    VALUES (${id}, ${key}, '1', 'counter', 'system', now())
    ON CONFLICT (setting_key)
    DO UPDATE SET setting_value = (settings.setting_value::int + 1)::text, updated_at = now()
    RETURNING setting_value AS value
  `;
  return Number(result[0].value);
}

export async function generateDemandNo(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await nextSequenceNumber(`demand_seq_${year}`);
  return `DEM-${year}-${String(seq).padStart(4, "0")}`;
}

export async function generateCandidateCode(): Promise<string> {
  const seq = await nextSequenceNumber("candidate_seq");
  return `RC-CAN-${String(seq).padStart(6, "0")}`;
}
