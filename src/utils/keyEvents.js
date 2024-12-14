import { useCallback } from 'react';

export const createNewRow = (setData) => {
	const newRow = {
		task: '',
		target: '',
		status: '',
	};
	setData((prevData) => [...prevData, newRow]);
};

export const handleKeyDown = (
	activeCell,
	setActiveCell,
	columns,
	data,
	setData
) =>
	useCallback(
		(e) => {
			const { row, col } = activeCell;
			const lastRow = data.length - 1;
			const lastCol = columns.length - 1;

			switch (e.key) {
				case 'Enter':
					e.preventDefault();
					const nextCol = col + 1;
					const nextRow = nextCol > lastCol ? row + 1 : row;

					if (row === lastRow && col === lastCol) {
						const isRowComplete = columns.every(
							(column) => data[row][column.key]?.trim() !== ''
						);
						if (isRowComplete) {
							createNewRow(setData);
							setActiveCell({ row: row + 1, col: 0 });
						}
					} else {
						setActiveCell({
							row: nextRow > lastRow ? lastRow : nextRow,
							col: nextCol > lastCol ? 0 : nextCol,
						});
					}
					break;

				case 'ArrowDown':
					e.preventDefault();
					setActiveCell((prev) => ({
						row: Math.min(prev.row + 1, data.length - 1),
						col: prev.col,
					}));
					break;

				case 'ArrowUp':
					e.preventDefault();
					setActiveCell((prev) => ({
						row: Math.max(prev.row - 1, 0),
						col: prev.col,
					}));
					break;

				case 'ArrowRight':
					e.preventDefault();
					setActiveCell((prev) => ({
						row: prev.row,
						col: Math.min(prev.col + 1, columns.length - 1),
					}));
					break;

				case 'ArrowLeft':
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
		[activeCell, data, columns]
	);
