import { NextFunction, Request, Response } from "express";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query);
    const unreadOnly = req.query.unreadOnly === "true";
    const { data, total, unreadCount } = await listMyNotifications(req.user!, pagination, unreadOnly);
    res.json({
      data,
      unreadCount,
      meta: paginationMeta(pagination.page, pagination.pageSize, total),
    });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await markNotificationRead(req.params.id, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await markAllNotificationsRead(req.user!));
  } catch (err) {
    next(err);
  }
}
