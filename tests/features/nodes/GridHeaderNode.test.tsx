import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { NodeProps } from "@xyflow/react";
import GridHeaderCell from "@src/features/nodes/components/nodes/GridHeaderNode";
import {
	GRID_HEADER_TYPE,
	toGridHeaderNode,
	type GridHeaderNode,
} from "@src/features/nodes/components/nodes/gridHeader";
import { BoardActionsContext } from "@src/features/nodes/components/BoardActionsContext";

const header = {
	id: "grid-row-1",
	axis: "row" as const,
	index: 1,
	label: "",
	x: -128,
	y: 60,
	width: 120,
	height: 50,
};

describe("grid header node", () => {
	it("keeps pointer events on, so the name can be double-clicked", () => {
		const node = toGridHeaderNode(header);
		expect(node.type).toBe(GRID_HEADER_TYPE);
		// React Flow switches pointer events off for a node that can't be selected or dragged.
		expect(node.style).toMatchObject({ pointerEvents: "all" });
		// It still cannot be moved, selected, linked or deleted.
		expect([node.draggable, node.selectable, node.connectable, node.deletable]).toEqual([
			false,
			false,
			false,
			false,
		]);
	});

	it("renames through the board actions on double-click", () => {
		const setGridLabel = vi.fn();
		const node = toGridHeaderNode(header);
		const props = { id: node.id, data: node.data } as unknown as NodeProps<GridHeaderNode>;
		render(
			<BoardActionsContext.Provider value={{ updateNodeData: vi.fn(), setGridLabel }}>
				<GridHeaderCell {...props} />
			</BoardActionsContext.Provider>,
		);

		fireEvent.doubleClick(screen.getByText("Row 2"));
		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "Tuesday" } });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(setGridLabel).toHaveBeenCalledWith("row", 1, "Tuesday");
	});
});
