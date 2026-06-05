declare global {
  // Minimal Cloudflare runtime types used by this app.
  interface D1Result<T = unknown> {
    success: boolean;
    results: T[];
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    run<T = unknown>(): Promise<D1Result<T>>;
    first<T = unknown>(colName?: string): Promise<T | null>;
    all<T = unknown>(): Promise<D1Result<T>>;
    raw<T = unknown>(): Promise<T[]>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec(query: string): Promise<D1Result>;
  }

  interface R2ObjectBody {
    arrayBuffer(): Promise<ArrayBuffer>;
  }

  interface R2Bucket {
    get(key: string): Promise<R2ObjectBody | null>;
    put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob): Promise<void>;
    delete(key: string): Promise<void>;
  }

  interface CloudflareEnv {
    DB?: D1Database;
    IMAGES_BUCKET?: R2Bucket;
  }
}

export {};
