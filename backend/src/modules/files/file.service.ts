import { createHash, randomUUID } from "crypto";
import path from "path";
import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { storage } from "../../lib/localStorageAdapter";
import { HttpError } from "../../middleware/errorHandler";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function isAllowedMimeType(mimeType: string) {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

function safeExtension(originalName: string) {
  const ext = path.extname(originalName);
  return /^\.[a-zA-Z0-9]{1,10}$/.test(ext) ? ext : "";
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  context: AuditContext,
) {
  const storageKey = `${randomUUID()}${safeExtension(originalName)}`;
  const checksum = createHash("sha256").update(buffer).digest("hex");

  await storage.save(storageKey, buffer);

  const file = await prisma.fileRegistry.create({
    data: {
      storageKey,
      originalName,
      mimeType,
      size: buffer.length,
      checksum,
      uploadedBy: context.userId,
    },
  });

  await writeAuditLog({
    ...context,
    action: "FILE_UPLOADED",
    entityType: "FileRegistry",
    entityId: file.id,
    after: file,
  });

  return file;
}

export async function getFile(id: string) {
  const file = await prisma.fileRegistry.findUnique({ where: { id } });
  if (!file || file.archivedAt) {
    throw new HttpError(404, "File not found");
  }
  return file;
}

export async function readFileBuffer(id: string) {
  const file = await getFile(id);
  const buffer = await storage.read(file.storageKey);
  return { file, buffer };
}

export async function archiveFile(id: string, context: AuditContext, isPrivileged: boolean) {
  const file = await prisma.fileRegistry.findUnique({ where: { id } });
  if (!file || file.archivedAt) {
    throw new HttpError(404, "File not found");
  }
  if (file.uploadedBy !== context.userId && !isPrivileged) {
    throw new HttpError(403, "Not permitted to archive this file");
  }

  const archived = await prisma.fileRegistry.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  await writeAuditLog({
    ...context,
    action: "FILE_ARCHIVED",
    entityType: "FileRegistry",
    entityId: archived.id,
    before: file,
    after: archived,
  });

  return archived;
}
