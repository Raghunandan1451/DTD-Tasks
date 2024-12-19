import { useState } from 'react';
import { useTableContext } from '@components/Table/TableContext';

const Dropdown = ({ column, row, rowIndex, colIndex }) => {
	const { handleCellDataChange, setActiveCell, inputRefs } =
		useTableContext();
	const options = column.options || [];
	const [enterCount, setEnterCount] = useState(0);

	const handleSelectChange = (e) => {
		const selectedValue = e.target.value;
		handleCellDataChange(row.uid, column.key, selectedValue);
	};

	const handleKeyDown = (e) => {
		const isSelectFocused =
			inputRefs.current[`${rowIndex}-${colIndex}`] ===
			document.activeElement;
		if (e.key === 'Enter' && isSelectFocused) {
			if (enterCount === 0) {
				// First Enter: Stop propagation and open dropdown
				e.stopPropagation();
				setEnterCount(1);
			} else if (enterCount === 1) {
				// Second Enter: Allow value selection
				setEnterCount(2); // Ready for propagation after this
			} else {
				// Third Enter: Propagate normally
				setEnterCount(0); // Reset count for next interaction
			}
		}
	};

	return (
		<select
			value={row[column.key] || ''}
			onChange={handleSelectChange}
			onKeyDown={handleKeyDown}
			onFocus={() => {
				setActiveCell({ row: rowIndex, col: colIndex });
				setEnterCount(0); // Reset when dropdown gains focus
			}}
			ref={(el) => (inputRefs.current[`${rowIndex}-${colIndex}`] = el)}
			className="w-full bg-transparent outline-none">
			<option
				value=""
				className="dark:text-white dark:bg-gray-800"
				disabled>
				Select an option
			</option>
			{options.map((option, index) => (
				<option
					key={index}
					value={option}
					className="dark:text-white dark:bg-gray-800">
					{option}
				</option>
			))}
		</select>
	);
};

export default Dropdown;
