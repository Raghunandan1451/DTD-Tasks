import React, { useState, useEffect, useRef } from 'react';
import TableRow from '@components/molecules/TableRow/TableRow';
import TableHeader from '@components/molecules/TableHeader/TableHeader';
import { TableProvider } from '@src/context/TableContext';
import { Column, RowData } from '@components/shared/table';
import { handleKeyDown } from '@src/utils/keyEvents';

interface TableProps {
	columns: Column[];
	data: RowData[];
	onAddRow: (newRow: RowData) => void;
	onUpdate: (uniqueId: string, columnKey: string, newValue: string) => void;
	onDeleteRow: (uniqueId: string) => void;
	showNotification: (message: string) => void;
}

const CustomTable: React.FC<TableProps> = ({
	columns,
	data,
	onAddRow,
	onUpdate,
	onDeleteRow,
	showNotification,
}) => {
	const [activeCell, setActiveCell] = useState<{
		row: number;
		col: number;
	}>({ row: 0, col: 0 });
	const [minRows, setMinRows] = useState(0);

	const containerRef = useRef<HTMLDivElement>(null);
	const cellRef = useRef<HTMLTableSectionElement | null>(null);
	const inputRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

	useEffect(() => {
		const calculateMinRows = () => {
			const displayHeight = containerRef.current?.clientHeight ?? 0;
			const rowHeight = cellRef.current?.clientHeight ?? 0;
			const calcMin = Math.floor(displayHeight / rowHeight) - 1;
			setMinRows(calcMin);
		};
		calculateMinRows();
		window.addEventListener('resize', calculateMinRows);
		return () => {
			window.removeEventListener('resize', calculateMinRows);
		};
	}, []);

	const handleCellDataChange = (
		uniqueId: string,
		columnKey: string,
		newValue: string
	) => {
		onUpdate(uniqueId, columnKey, newValue);
	};

	const handleCellChange = handleKeyDown(
		activeCell,
		setActiveCell,
		columns,
		data,
		onAddRow,
		onDeleteRow
	);

	useEffect(() => {
		const currentInput =
			inputRefs.current[`${activeCell.row}-${activeCell.col}`];
		if (currentInput) {
			currentInput.focus();
		}
	}, [activeCell]);

	const rowsToRender: RowData[] = [
		...data,
		...Array.from({ length: Math.max(minRows - data.length, 0) }).map(
			() => ({} as RowData)
		),
	];

	const contextValue = {
		handleCellDataChange,
		activeCell,
		setActiveCell,
		inputRefs,
		cellRef,
		showNotification,
	};

	return (
		<TableProvider value={contextValue}>
			<div
				className="overflow-y-auto flex-1 scrollbar-hide border"
				tabIndex={0}
				ref={containerRef}
				onKeyDown={handleCellChange}>
				<table className="min-w-full table-auto">
					<TableHeader columns={columns} />

					<tbody>
						{rowsToRender.map((row, rowIndex) => (
							<TableRow
								key={row.uid || rowIndex}
								rowIndex={rowIndex}
								row={row}
								columns={columns}
							/>
						))}
					</tbody>
				</table>
			</div>
		</TableProvider>
	);
};

export default CustomTable;
