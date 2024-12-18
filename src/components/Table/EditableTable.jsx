import { useState, useRef, useEffect } from 'react';
import { handleKeyDown } from '@utils/keyEvents';
import TableRow from '@components/Table/TableRow';
import TableHeader from '@components/Table/TableHeader';
import { TableProvider } from '@components/Table/TableContext';

const EditableTable = ({ columns, data, onAddRow, onUpdate, onDeleteRow }) => {
	const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
	const [minRows, setMinRows] = useState(0);

	const containerRef = useRef(null);
	const cellRef = useRef(null);
	const inputRefs = useRef({});

	useEffect(() => {
		const calculateMinRows = () => {
			const displayHeight =
				containerRef.current.getBoundingClientRect().height;
			const rowHeight = cellRef.current.clientHeight;
			const calcMin = Math.floor(displayHeight / rowHeight) - 1;
			setMinRows(calcMin);
		};
		calculateMinRows();

		window.addEventListener('resize', calculateMinRows);
		return () => {
			window.removeEventListener('resize', calculateMinRows);
		};
	}, []);

	const handleCellDataChange = (uniqueId, columnKey, newValue) => {
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
		let currentInput =
			inputRefs.current[`${activeCell.row}-${activeCell.col}`];
		if (currentInput) {
			currentInput.focus();
		}
	}, [activeCell]);

	const rowsToRender = [
		...data,
		...Array.from({ length: Math.max(minRows - data.length, 0) }).map(
			() => ({})
		), // Render empty rows till minRows < data.length
	];

	const contextValue = {
		handleCellDataChange,
		activeCell,
		setActiveCell,
		inputRefs,
		cellRef,
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
								key={row.id || rowIndex}
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

export default EditableTable;
