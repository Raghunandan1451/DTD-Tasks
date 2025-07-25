import {
	CellPosition,
	Column,
	DeleteParams,
	RowData,
} from "@src/lib/types/table";
import React, { useCallback } from "react";

export const useHandleTableKeyEvent = (
	activeCell: CellPosition,
	setActiveCell: React.Dispatch<React.SetStateAction<CellPosition>>,
	columns: Column[],
	data: RowData[],
	addRow: () => void,
	deleteRow: (params: DeleteParams) => void
) => {
	const handleTableKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLElement>) => {
			const { row, col } = activeCell;
			const lastRow = data.length - 1;
			const lastCol = columns.length - 1;

			const nextCol = col + 1;
			const nextRow = nextCol > lastCol ? row + 1 : row;

			switch (e.key) {
				case "Enter":
					e.preventDefault();

					if (row === lastRow && col === lastCol) {
						const isRowComplete = columns.every(
							(column) => data[row][column.key]?.trim() !== ""
						);
						if (isRowComplete) {
							addRow();
							setActiveCell({ row: row + 1, col: 0 });
						}
					} else {
						setActiveCell({
							row: nextRow > lastRow ? lastRow : nextRow,
							col: nextCol > lastCol ? 0 : nextCol,
						});
					}
					break;
				case "Delete":
					if (
						data[row] &&
						window.confirm(
							"Are you sure you want to delete this row?"
						)
					) {
						const newFocusRow = row - 1 >= 0 ? row - 1 : 0;
						deleteRow({ uid: data[row].uid, length: data.length });
						setActiveCell({ row: newFocusRow, col: 0 });
					}
					break;

				case "ArrowDown":
					e.preventDefault();
					setActiveCell((prev) => ({
						row: Math.min(prev.row + 1, data.length - 1),
						col: prev.col,
					}));
					break;

				case "ArrowUp":
					e.preventDefault();
					setActiveCell((prev) => ({
						row: Math.max(prev.row - 1, 0),
						col: prev.col,
					}));
					break;

				case "ArrowRight":
					e.preventDefault();
					setActiveCell((prev) => ({
						row: prev.row,
						col: Math.min(prev.col + 1, columns.length - 1),
					}));
					break;

				case "ArrowLeft":
					e.preventDefault();
					setActiveCell((prev) => ({
						row: prev.row,
						col: Math.max(prev.col - 1, 0),
					}));
					break;

				default:
					break;
			}
		},
		[activeCell, data, columns, setActiveCell, addRow, deleteRow]
	);

	return handleTableKeyDown;
};
