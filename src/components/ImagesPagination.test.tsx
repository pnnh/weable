import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ImagesPagination from "@/components/ImagesPagination";

const labels = { prevPage: "Previous", nextPage: "Next" };

type Props = {
    page: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
};

function renderPagination(props: Partial<Props> = {}) {
    return render(
        <ImagesPagination
            page={1}
            total={100}
            pageSize={10}
            onPageChange={props.onPageChange ?? vi.fn()}
            labels={labels}
            {...props}
        />,
    );
}

describe("ImagesPagination", () => {
    it("total ≤ pageSize 时不渲染任何内容", () => {
        const { container } = renderPagination({ total: 10, pageSize: 10 });
        expect(container).toBeEmptyDOMElement();
    });

    it("页码窗口含首尾页与省略号", () => {
        renderPagination({ page: 5, total: 200, pageSize: 10 });
        // 窗口 = 1 … 4 5 6 … 20
        for (const p of ["1", "4", "5", "6", "20"]) {
            expect(screen.getByRole("button", { name: p })).toBeInTheDocument();
        }
        expect(screen.getAllByText("…")).toHaveLength(2);
        expect(screen.getByRole("button", { name: "5" })).toHaveAttribute(
            "aria-current",
            "page",
        );
    });

    it("首页时上一页禁用，末页时下一页禁用", () => {
        renderPagination({ page: 1 });
        expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();

        renderPagination({ page: 10, total: 100, pageSize: 10 });
        expect(screen.getAllByRole("button", { name: "Next" }).at(-1)).toBeDisabled();
    });

    it("点击页码与上下页触发 onPageChange 并携带目标页", () => {
        const onPageChange = vi.fn();
        renderPagination({ page: 5, onPageChange });
        fireEvent.click(screen.getByRole("button", { name: "6" }));
        expect(onPageChange).toHaveBeenCalledWith(6);
        fireEvent.click(screen.getByRole("button", { name: "Next" }));
        expect(onPageChange).toHaveBeenCalledWith(6);
        fireEvent.click(screen.getByRole("button", { name: "Previous" }));
        expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it("page 越界时收敛到合法范围", () => {
        renderPagination({ page: 99, total: 100, pageSize: 10 });
        // 收敛到末页 10：当前页高亮且下一页禁用
        expect(screen.getByRole("button", { name: "10" })).toHaveAttribute(
            "aria-current",
            "page",
        );
        expect(screen.getAllByRole("button", { name: "Next" }).at(-1)).toBeDisabled();
    });
});
