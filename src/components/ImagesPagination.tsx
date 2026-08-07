"use client";

type Props = {
    page: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    labels: {
        prevPage: string;
        nextPage: string;
    };
};

// 页码窗口：首页、尾页、当前页 ±1，缺口以省略号呈现（research.md R9）
function buildPageWindow(page: number, totalPages: number): (number | "gap")[] {
    const wanted = new Set<number>([1, totalPages, page - 1, page, page + 1]);
    const pages = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const window: (number | "gap")[] = [];
    let prev = 0;
    for (const n of pages) {
        if (prev && n - prev > 1) window.push("gap");
        window.push(n);
        prev = n;
    }
    return window;
}

// 传统分页控件：上一页/下一页 + 页码窗口；total ≤ pageSize 时不渲染
export default function ImagesPagination({ page, total, pageSize, onPageChange, labels }: Props) {
    if (total <= pageSize) return null;

    const totalPages = Math.ceil(total / pageSize);
    const current = Math.min(Math.max(page, 1), totalPages);
    const buttonClass =
        "px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed";

    return (
        <nav className="flex items-center gap-1 mt-4">
            <button
                type="button"
                disabled={current <= 1}
                onClick={() => onPageChange(current - 1)}
                className={buttonClass}
            >
                {labels.prevPage}
            </button>
            {buildPageWindow(current, totalPages).map((entry, i) =>
                entry === "gap" ? (
                    <span key={`gap-${i}`} className="px-2 text-sm text-gray-400">
                        …
                    </span>
                ) : (
                    <button
                        key={entry}
                        type="button"
                        onClick={() => onPageChange(entry)}
                        aria-current={entry === current ? "page" : undefined}
                        className={`px-3 py-1 text-sm border rounded-md ${entry === current
                                ? "font-medium text-white bg-blue-600 border-blue-600"
                                : "text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
                            }`}
                    >
                        {entry}
                    </button>
                ),
            )}
            <button
                type="button"
                disabled={current >= totalPages}
                onClick={() => onPageChange(current + 1)}
                className={buttonClass}
            >
                {labels.nextPage}
            </button>
        </nav>
    );
}
