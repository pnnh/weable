import { describe, expect, it } from "vitest";
import { buildBatches, deduplicateFiles, isEntryDisabled } from "./UploadQueue";
import type { QueueEntry } from "./UploadQueue";

// 构造最小 QueueEntry 用于测试
function makeEntry(overrides: Partial<QueueEntry> = {}): QueueEntry {
    return {
        name: "test.jpg",
        size: 1024,
        lastModified: Date.now(),
        status: "pending",
        failCount: 0,
        lastError: null,
        selected: true,
        parentId: null,
        file: {} as File, // 测试中仅需非 null 的占位值
        ...overrides,
    };
}

// ─── buildBatches ────────────────────────────────────────────────────────────

describe("buildBatches", () => {
    it("0 个可上传条目 → 空批次列表", () => {
        expect(buildBatches([])).toEqual([]);
    });

    it("未选中的条目不进入批次", () => {
        const entries = [makeEntry({ selected: false })];
        expect(buildBatches(entries)).toEqual([]);
    });

    it("file=null 的条目不进入批次", () => {
        const entries = [makeEntry({ file: null })];
        expect(buildBatches(entries)).toEqual([]);
    });

    it("status=success 的条目不进入批次", () => {
        const entries = [makeEntry({ status: "success" })];
        expect(buildBatches(entries)).toEqual([]);
    });

    it("status=oversized 的条目不进入批次", () => {
        const entries = [makeEntry({ status: "oversized" })];
        expect(buildBatches(entries)).toEqual([]);
    });

    it("failCount >= 3 的条目不进入批次", () => {
        const entries = [makeEntry({ status: "failed", failCount: 3 })];
        expect(buildBatches(entries)).toEqual([]);
    });

    it("1 个可上传条目 → 1 批，含 1 个", () => {
        const entries = [makeEntry({ name: "a.jpg" })];
        const batches = buildBatches(entries);
        expect(batches).toHaveLength(1);
        expect(batches[0]).toHaveLength(1);
    });

    it("3 个可上传条目 → 1 批，含 3 个", () => {
        const entries = [
            makeEntry({ name: "a.jpg" }),
            makeEntry({ name: "b.jpg" }),
            makeEntry({ name: "c.jpg" }),
        ];
        const batches = buildBatches(entries);
        expect(batches).toHaveLength(1);
        expect(batches[0]).toHaveLength(3);
    });

    it("4 个可上传条目 → 2 批 [3, 1]", () => {
        const entries = [
            makeEntry({ name: "a.jpg" }),
            makeEntry({ name: "b.jpg" }),
            makeEntry({ name: "c.jpg" }),
            makeEntry({ name: "d.jpg" }),
        ];
        const batches = buildBatches(entries);
        expect(batches).toHaveLength(2);
        expect(batches[0]).toHaveLength(3);
        expect(batches[1]).toHaveLength(1);
    });

    it("6 个可上传条目 → 2 批 [3, 3]", () => {
        const entries = Array.from({ length: 6 }, (_, i) =>
            makeEntry({ name: `file${i}.jpg` }),
        );
        const batches = buildBatches(entries);
        expect(batches).toHaveLength(2);
        expect(batches[0]).toHaveLength(3);
        expect(batches[1]).toHaveLength(3);
    });
});

// ─── isEntryDisabled ─────────────────────────────────────────────────────────

describe("isEntryDisabled", () => {
    it("status=success → 禁用", () => {
        expect(isEntryDisabled(makeEntry({ status: "success" }))).toBe(true);
    });

    it("status=oversized → 禁用", () => {
        expect(isEntryDisabled(makeEntry({ status: "oversized" }))).toBe(true);
    });

    it("status=needs_file → 禁用", () => {
        expect(isEntryDisabled(makeEntry({ status: "needs_file" }))).toBe(true);
    });

    it("status=failed, failCount=3 → 禁用", () => {
        expect(isEntryDisabled(makeEntry({ status: "failed", failCount: 3 }))).toBe(true);
    });

    it("status=failed, failCount=2 → 不禁用", () => {
        expect(isEntryDisabled(makeEntry({ status: "failed", failCount: 2 }))).toBe(false);
    });

    it("status=pending → 不禁用", () => {
        expect(isEntryDisabled(makeEntry({ status: "pending" }))).toBe(false);
    });

    it("status=uploading → 不禁用", () => {
        expect(isEntryDisabled(makeEntry({ status: "uploading" }))).toBe(false);
    });
});

// ─── deduplicateFiles ────────────────────────────────────────────────────────

function makeFile(name: string, size = 1024): File {
    return new File([new Uint8Array(size)], name, { type: "image/jpeg" });
}

describe("deduplicateFiles", () => {
    it("完全新文件全部入队，skipCount=0", () => {
        const files = [makeFile("a.jpg"), makeFile("b.jpg")];
        const existing: QueueEntry[] = [];
        const { toAdd, skipCount } = deduplicateFiles(files, existing);
        expect(toAdd).toHaveLength(2);
        expect(skipCount).toBe(0);
    });

    it("完全重复文件全部跳过，skipCount=2", () => {
        const files = [makeFile("a.jpg"), makeFile("b.jpg")];
        const existing = [makeEntry({ name: "a.jpg" }), makeEntry({ name: "b.jpg" })];
        const { toAdd, skipCount } = deduplicateFiles(files, existing);
        expect(toAdd).toHaveLength(0);
        expect(skipCount).toBe(2);
    });

    it("混合场景：仅新文件入队，重复文件计入 skipCount", () => {
        const files = [makeFile("a.jpg"), makeFile("b.jpg"), makeFile("c.jpg")];
        const existing = [makeEntry({ name: "a.jpg" })];
        const { toAdd, skipCount } = deduplicateFiles(files, existing);
        expect(toAdd).toHaveLength(2);
        expect(toAdd.map((f) => f.name)).toEqual(["b.jpg", "c.jpg"]);
        expect(skipCount).toBe(1);
    });

    it("本次选择内部重复文件只入队一次", () => {
        const files = [makeFile("a.jpg"), makeFile("a.jpg")];
        const existing: QueueEntry[] = [];
        const { toAdd, skipCount } = deduplicateFiles(files, existing);
        expect(toAdd).toHaveLength(1);
        expect(skipCount).toBe(1);
    });

    // Session Storage 恢复相关：failCount=3/status=failed 不改为 needs_file
    it("isEntryDisabled: failCount=3 + status=failed → 禁用（不改为 needs_file）", () => {
        const entry = makeEntry({ status: "failed", failCount: 3 });
        expect(isEntryDisabled(entry)).toBe(true);
    });

    // failCount=2 的条目，loadFromStorage 应恢复为 needs_file（此处验证 isEntryDisabled 会返回 true）
    it("isEntryDisabled: needs_file（failCount=2 恢复后）→ 禁用", () => {
        const entry = makeEntry({ status: "needs_file", failCount: 2 });
        expect(isEntryDisabled(entry)).toBe(true);
    });
});
