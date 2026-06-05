import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface StorageAdapter {
  save(imageId: string, filename: string, data: Buffer): Promise<void>;
  read(imageId: string, filename: string): Promise<Buffer | null>;
  delete(imageId: string, filename: string): Promise<void>;
}

export interface AvatarStorage {
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
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

function toUint8Array(data: Buffer): Uint8Array {
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

function toBuffer(value: ArrayBuffer | ArrayBufferView): Buffer {
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  return Buffer.from(value);
}

function getR2BucketBinding(): { bucket: R2Bucket | undefined; inCfContext: boolean } {
  try {
    const { env } = getCloudflareContext();
    return { bucket: env?.IMAGES_BUCKET, inCfContext: true };
  } catch {
    return { bucket: undefined, inCfContext: false };
  }
}

function resolveR2ObjectKey(imageId: string, filename: string): string {
  assertSafeSegment(imageId, "imageId");
  assertSafeSegment(filename, "filename");
  return `${imageId}/${filename}`;
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

export class R2StorageAdapter implements StorageAdapter {
  constructor(private readonly bucket: R2Bucket) {}

  async save(imageId: string, filename: string, data: Buffer): Promise<void> {
    await this.bucket.put(resolveR2ObjectKey(imageId, filename), toUint8Array(data));
  }

  async read(imageId: string, filename: string): Promise<Buffer | null> {
    const object = await this.bucket.get(resolveR2ObjectKey(imageId, filename));
    if (!object) {
      return null;
    }

    const arrayBuffer = await object.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(imageId: string, filename: string): Promise<void> {
    await this.bucket.delete(resolveR2ObjectKey(imageId, filename));
  }
}

export class LocalAvatarStorage implements AvatarStorage {
  constructor(private readonly baseStorage: StorageAdapter) {}

  save(key: string, data: Buffer): Promise<void> {
    return this.baseStorage.save("__avatar__", key, data);
  }

  read(key: string): Promise<Buffer | null> {
    return this.baseStorage.read("__avatar__", key);
  }

  delete(key: string): Promise<void> {
    return this.baseStorage.delete("__avatar__", key);
  }
}

export class R2AvatarStorage implements AvatarStorage {
  constructor(private readonly bucket: R2Bucket) {}

  private toObjectKey(key: string): string {
    assertSafeSegment(key, "avatar key");
    return `avatar/${key}`;
  }

  async save(key: string, data: Buffer): Promise<void> {
    await this.bucket.put(this.toObjectKey(key), toUint8Array(data));
  }

  async read(key: string): Promise<Buffer | null> {
    const object = await this.bucket.get(this.toObjectKey(key));
    if (!object) {
      return null;
    }

    const bytes = await object.arrayBuffer();
    return toBuffer(bytes);
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(this.toObjectKey(key));
  }
}

let storageInstance: StorageAdapter | undefined;
let avatarStorageInstance: AvatarStorage | undefined;

export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    const { bucket, inCfContext } = getR2BucketBinding();
    if (bucket) {
      storageInstance = new R2StorageAdapter(bucket);
    } else {
      if (inCfContext) {
        throw new Error("Cloudflare R2 binding IMAGES_BUCKET is not configured. Check wrangler.jsonc R2 configuration.");
      }
      storageInstance = new LocalStorageAdapter();
    }
  }
  return storageInstance;
}

export function getAvatarStorage(): AvatarStorage {
  if (!avatarStorageInstance) {
    const { bucket, inCfContext } = getR2BucketBinding();
    if (bucket) {
      avatarStorageInstance = new R2AvatarStorage(bucket);
    } else {
      if (inCfContext) {
        throw new Error("Cloudflare R2 binding IMAGES_BUCKET is not configured. Check wrangler.jsonc R2 configuration.");
      }
      avatarStorageInstance = new LocalAvatarStorage(getStorage());
    }
  }

  return avatarStorageInstance;
}
