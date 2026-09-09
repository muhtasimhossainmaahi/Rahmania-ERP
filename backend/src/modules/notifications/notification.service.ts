import { Role } from "@prisma/client";
import { prisma } from "../../config/db";
import { HttpError } from "../../middleware/errorHandler";
import { PaginationParams } from "../../lib/pagination";
import { Actor } from "../candidates/candidate.service";

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

// Internal helper for other modules' write paths (SRS 16's automation
// triggers) — not exposed as its own create endpoint, since notifications
// are system-generated from real events rather than authored by users.
export async function notifyUsers(userIds: string[], payload: NotificationPayload) {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) {
    return;
  }
  await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({ userId, ...payload })),
  });
}

// Broadcasts to every active user holding one of the given roles — the
// most direct reading of SRS 16's role-named recipients (e.g. "Operations/
// Embassy"), since neither the DB design nor section 6 defines a single
// "department manager" concept distinct from a role. Documented as a
// judgment call in docs/BUILD_NOTES.md.
export async function notifyRoles(roles: Role[], payload: NotificationPayload) {
  const users = await prisma.user.findMany({
    where: { role: { in: roles }, isActive: true },
    select: { id: true },
  });
  await notifyUsers(
    users.map((u) => u.id),
    payload,
  );
}

export async function listMyNotifications(
  actor: Actor,
  pagination: PaginationParams,
  unreadOnly: boolean,
) {
  const where = { userId: actor.id, ...(unreadOnly ? { readAt: null } : {}) };

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: actor.id, readAt: null } }),
  ]);

  return { data, total, unreadCount };
}

export async function markNotificationRead(id: string, actor: Actor) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== actor.id) {
    throw new HttpError(404, "Notification not found");
  }
  if (notification.readAt) {
    return notification;
  }
  return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(actor: Actor) {
  await prisma.notification.updateMany({
    where: { userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: true };
}
