export const TAGS_MAX_CHARS = 500;
export const AI_TAGS_MAX = 8;

export function normalizeTags(raw: string): string {
    const parts = raw
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    const joined = parts.join(", ");
    if (joined.length <= TAGS_MAX_CHARS) return joined;

    const cut = joined.slice(0, TAGS_MAX_CHARS);
    const lastSep = cut.lastIndexOf(", ");
    if (lastSep > 0) return cut.slice(0, lastSep);
    return cut;
}

export function tagsFromRecognition(raw: unknown): string {
    if (raw == null) return "";
    let items: string[];
    if (Array.isArray(raw)) {
        items = raw.map((item) => String(item));
    } else if (typeof raw === "string") {
        items = [raw];
    } else {
        return "";
    }
    const normalized = normalizeTags(items.join(","));
    if (!normalized) return "";
    return normalized.split(", ").slice(0, AI_TAGS_MAX).join(", ");
}
