import { promises as fs } from "fs";
import path from "path";
import { env } from "../config/env";
import { StorageAdapter } from "./storage";

class LocalStorageAdapter implements StorageAdapter {
  private baseDir = path.resolve(env.storageDir);

  async save(key: string, buffer: Buffer) {
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.writeFile(this.resolveKey(key), buffer);
  }

  async read(key: string) {
    return fs.readFile(this.resolveKey(key));
  }

  async delete(key: string) {
    await fs.rm(this.resolveKey(key), { force: true });
  }

  private resolveKey(key: string) {
    return path.join(this.baseDir, key);
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter();
