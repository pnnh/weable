export interface StorageAdapter {
  save(imageId: string, filename: string, data: Buffer): Promise<void>;
  read(imageId: string, filename: string): Promise<Buffer | null>;
  delete(imageId: string, filename: string): Promise<void>;
}

function assertSafeSegment(value: string, field: string): void {
  if (
    !value ||
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\")
  ) {
    throw new Error(`Invalid ${field}`);
  }
}

async function resolveStoragePath(storageRoot: string, imageId: string, filename: string) {
  assertSafeSegment(imageId, "imageId");
  assertSafeSegment(filename, "filename");

  const path = await import("node:path");
  return path.join(storageRoot, imageId, filename);
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(
    private readonly storageRoot = process.env.IMAGE_STORAGE_PATH || "./.data/uploads"
  ) {}

  async save(imageId: string, filename: string, data: Buffer): Promise<void> {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = await resolveStoragePath(this.storageRoot, imageId, filename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  }

  async read(imageId: string, filename: string): Promise<Buffer | null> {
    const fs = await import("node:fs/promises");
    const filePath = await resolveStoragePath(this.storageRoot, imageId, filename);

    try {
      return await fs.readFile(filePath);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return null;
      }

      throw error;
    }
  }

  async delete(imageId: string, filename: string): Promise<void> {
    const fs = await import("node:fs/promises");
    const filePath = await resolveStoragePath(this.storageRoot, imageId, filename);

    try {
      await fs.rm(filePath);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return;
      }

      throw error;
    }
  }
}

let storageInstance: StorageAdapter | undefined;

export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    storageInstance = new LocalStorageAdapter();
  }
  return storageInstance;
}
