import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { list, markAllRead, markRead } from "./notification.controller";

export const notificationRouter = Router();

notificationRouter.use(authenticate);

// A personal inbox — every authenticated role reads and manages only its
// own notifications (scoped to req.user in the service layer), so there's
// no role gating here beyond being logged in. No matrix row exists for
// this (it's not a data module like Candidates/Documents), consistent
// with Contract/Ticket/Departure's "no dedicated row" situation.
notificationRouter.get("/", list);
notificationRouter.patch("/read-all", markAllRead);
notificationRouter.patch("/:id/read", markRead);
