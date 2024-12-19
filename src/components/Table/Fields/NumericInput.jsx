import { useTableContext } from '@components/Table/TableContext';

const TextInput = (props) => {
	const { column, row, rowIndex, colIndex } = props;

	const { handleCellDataChange, setActiveCell, inputRefs } =
		useTableContext();
	return (
		<input
			type="number"
			value={row[column.key]}
			onChange={(e) =>
				handleCellDataChange(row.uid, column.key, e.target.value)
			}
			ref={(el) => (inputRefs.current[`${rowIndex}-${colIndex}`] = el)}
			className="w-full bg-transparent outline-none"
			onFocus={() =>
				setActiveCell({
					row: rowIndex,
					col: colIndex,
				})
			}
		/>
	);
};

export default TextInput;
