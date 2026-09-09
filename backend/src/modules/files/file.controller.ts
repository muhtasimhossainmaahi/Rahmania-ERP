import { Role } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { HttpError } from "../../middleware/errorHandler";
import { archiveFile, getFile, isAllowedMimeType, readFileBuffer, uploadFile } from "./file.service";

export async function upload(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new HttpError(400, "No file provided");
    }
    if (!isAllowedMimeType(req.file.mimetype)) {
      throw new HttpError(415, "Unsupported file type");
    }
    const file = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, auditContext(req));
    res.status(201).json(file);
  } catch (err) {
    next(err);
  }
}

export async function getMetadata(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getFile(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function download(req: Request, res: Response, next: NextFunction) {
  try {
    const { file, buffer } = await readFileBuffer(req.params.id);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function archive(req: Request, res: Response, next: NextFunction) {
  try {
    const isPrivileged = req.user!.role === Role.SUPER_ADMIN || req.user!.role === Role.MANAGEMENT;
    res.json(await archiveFile(req.params.id, auditContext(req), isPrivileged));
  } catch (err) {
    next(err);
  }
}
