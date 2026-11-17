import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { BoardNode } from "@src/lib/db/types";
import { makeShapeNode } from "@src/features/nodes/lib/newBoard";
import {
	addColumn as gridAddColumn,
	addRow as gridAddRow,
	GRID_LABEL_MAX,
	removeColumn as gridRemoveColumn,
	removeLabel,
	removeRow as gridRemoveRow,
	setLabel,
	type GridResult,
} from "@src/features/nodes/lib/gridOps";
import { fromBoardNode, toBoardNodes } from "@src/features/nodes/lib/serialize";
import type { LayoutMeta, Mutate } from "@src/features/nodes/lib/boardEditorShared";

interface GridActionDeps {
	mutate: Mutate;
	metaRef: { current: LayoutMeta };
	setMetaState: Dispatch<SetStateAction<LayoutMeta>>;
}

/** Grid boards: add/remove rows and columns, and name them. Each is one undo step. */
export const useGridActions = ({ mutate, metaRef, setMetaState }: GridActionDeps) => {
	/**
	 * Applies a grid add/remove as one undo step; the column count and the names
	 * are part of the step. `relabel` moves the names along with the rows/columns.
	 */
	const changeGrid = useCallback(
		(
			operate: (items: BoardNode[], columns: number) => GridResult<BoardNode>,
			relabel: (rows: string[], columns: string[]) => { rows: string[]; columns: string[] } = (
				rows,
				columns,
			) => ({ rows, columns }),
		) => {
			mutate((currentNodes, currentEdges) => {
				const result = operate(toBoardNodes(currentNodes), metaRef.current.gridColumns);
				const existing = new Map(currentNodes.map((node) => [node.id, node]));
				const gone = new Set(result.removed.map((node) => node.id));
				const labels = relabel(metaRef.current.gridRowLabels, metaRef.current.gridColumnLabels);
				const next = {
					...metaRef.current,
					gridColumns: result.columns,
					gridRowLabels: labels.rows,
					gridColumnLabels: labels.columns,
				};
				metaRef.current = next;
				setMetaState(next);
				return {
					nodes: result.items.map((item) => existing.get(item.id) ?? fromBoardNode(item)),
					edges: currentEdges.filter((edge) => !gone.has(edge.source) && !gone.has(edge.target)),
				};
			});
		},
		[mutate, metaRef, setMetaState],
	);

	const addGridRow = useCallback(
		() => changeGrid((items, columns) => gridAddRow(items, columns, makeShapeNode)),
		[changeGrid],
	);
	const addGridColumn = useCallback(
		() => changeGrid((items, columns) => gridAddColumn(items, columns, makeShapeNode)),
		[changeGrid],
	);
	const removeGridRow = useCallback(
		(row: number) =>
			changeGrid(
				(items, columns) => gridRemoveRow(items, columns, row, makeShapeNode),
				(rows, columns) => ({ rows: removeLabel(rows, row), columns }),
			),
		[changeGrid],
	);
	const removeGridColumn = useCallback(
		(column: number) =>
			changeGrid(
				(items, columns) => gridRemoveColumn(items, columns, column, makeShapeNode),
				(rows, columns) => ({ rows, columns: removeLabel(columns, column) }),
			),
		[changeGrid],
	);

	/** Names a row, column or the corner cell (blank clears it) as one undo step. */
	const setGridLabel = useCallback(
		(axis: "row" | "column" | "corner", index: number, value: string) => {
			mutate(() => {
				const meta = metaRef.current;
				const next =
					axis === "row"
						? { ...meta, gridRowLabels: setLabel(meta.gridRowLabels, index, value) }
						: axis === "column"
							? { ...meta, gridColumnLabels: setLabel(meta.gridColumnLabels, index, value) }
							: { ...meta, gridCornerLabel: value.trim().slice(0, GRID_LABEL_MAX) };
				metaRef.current = next;
				setMetaState(next);
				return {};
			});
		},
		[mutate, metaRef, setMetaState],
	);

	return { addGridRow, addGridColumn, removeGridRow, removeGridColumn, setGridLabel };
};
