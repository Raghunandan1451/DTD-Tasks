import { useTableContext } from './TableContext';

const CellType = (props) => {
	const { columnType, column, row, rowIndex, colIndex } = props;

	const { handleCellDataChange, setActiveCell, inputRefs } =
		useTableContext();

	let CellContent = null;
	if (columnType === 'text') {
		CellContent = (
			<input
				type="text"
				value={row[column.key]}
				onChange={(e) =>
					handleCellDataChange(rowIndex, column.key, e.target.value)
				}
				ref={(el) =>
					(inputRefs.current[`${rowIndex}-${colIndex}`] = el)
				}
				className="w-full bg-transparent outline-none"
				onFocus={() =>
					setActiveCell({
						row: rowIndex,
						col: colIndex,
					})
				}
			/>
		);
	} else if (columnType === 'date') {
		CellContent = (
			<input
				type="date"
				value={row[column.key]}
				onChange={(e) =>
					handleCellDataChange(rowIndex, column.key, e.target.value)
				}
				className="w-full bg-transparent outline-none"
				onFocus={() =>
					setActiveCell({
						row: rowIndex,
						col: colIndex,
					})
				}
			/>
		);
	} else if (column.type === 'dropdown') {
		CellContent = (
			<select
				value={row[column.key]}
				onChange={(e) =>
					handleCellDataChange(rowIndex, column.key, e.target.value)
				}
				className="w-full bg-transparent outline-none"
				onFocus={() =>
					setActiveCell({
						row: rowIndex,
						col: colIndex,
					})
				}>
				{column.options.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
		);
	} else {
		CellContent = (
			<input
				type="text"
				value={row[column.key]}
				onChange={(e) =>
					handleCellDataChange(rowIndex, column.key, e.target.value)
				}
				ref={(el) =>
					(inputRefs.current[`${rowIndex}-${colIndex}`] = el)
				}
				className="w-full bg-transparent outline-none"
				onFocus={() =>
					setActiveCell({
						row: rowIndex,
						col: colIndex,
					})
				}
			/>
		);
	}

	return <>{CellContent}</>;
};

export default CellType;
