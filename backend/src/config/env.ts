import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  storageDir: process.env.STORAGE_DIR ?? "./storage",
  fileMaxSizeMb: Number(process.env.FILE_MAX_SIZE_MB ?? 10),
};
