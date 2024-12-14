import { useState, useRef, useEffect } from 'react';
import { handleKeyDown } from '../../utils/keyEvents';
import TableRow from './TableRow';
import TableHeader from './TableHeader';
import { TableProvider } from './TableContext';

const columns = [
	{ key: 'task', type: 'text', header: 'Task', className: 'w-1/2' },
	{
		key: 'target',
		type: 'date',
		header: 'Target Date',
		className: 'w-1/5',
	},
	{
		key: 'status',
		type: 'dropdown',
		header: 'Status',
		className: 'w-1/5',
		options: ['Not Started', 'In Progress', 'Completed'],
	},
];

const EditableTable = () => {
	const [data, setData] = useState([{ task: '', target: '', status: '' }]);
	const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
	const [minRows, setMinRows] = useState(0);

	const containerRef = useRef(null);
	const cellRef = useRef(null);
	const inputRefs = useRef({});

	useEffect(() => {
		const calculateMinRows = () => {
			const displayHeight = containerRef.current.clientHeight;
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

	const handleCellDataChange = (rowIndex, columnKey, newValue) => {
		setData((prevData) =>
			prevData.map((row, i) =>
				i === rowIndex ? { ...row, [columnKey]: newValue } : row
			)
		);
	};

	const handleCellChange = handleKeyDown(
		activeCell,
		setActiveCell,
		columns,
		data,
		setData
	);

	useEffect(() => {
		let currentInput =
			inputRefs.current[`${activeCell.row}-${activeCell.col}`];
		// console.log(currentInput);
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

					<tbody ref={cellRef}>
						{rowsToRender.map((row, rowIndex) => (
							<TableRow
								key={rowIndex}
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
