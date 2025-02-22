import { useTableContext } from '@components/Table/TableContext';

const NumericInput = (props) => {
	const { column, row, rowIndex, colIndex } = props;

	const { handleCellDataChange, setActiveCell, inputRefs, showNotification } =
		useTableContext();

	const handleNumberChange = (e) => {
		const value = parseFloat(e.target.value);

		if (value <= 0) {
			showNotification(
				'Negative numbers and zero are not allowed',
				'error'
			);
			return; // Don't update the value
		}

		handleCellDataChange(row.uid, column.key, e.target.value);
	};
	return (
		<input
			type="number"
			value={row[column.key]}
			onChange={(e) => handleNumberChange(e)}
			ref={(el) => (inputRefs.current[`${rowIndex}-${colIndex}`] = el)}
			className="w-full bg-transparent outline-hidden"
			onFocus={() =>
				setActiveCell({
					row: rowIndex,
					col: colIndex,
				})
			}
		/>
	);
};

export default NumericInput;
