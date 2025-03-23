import React, { useState } from 'react';
import { useTableContext } from '@components/Table/TableContext';
import Select from '@src/components/atoms/Select/Select';
import { BaseCellProps } from '@components/shared/table';

const DropdownCell: React.FC<BaseCellProps> = (props) => {
	const { column, row, rowIndex, colIndex } = props;
	const { handleCellDataChange, setActiveCell, inputRefs } =
		useTableContext();
	const options = column.options || [];
	const [enterCount, setEnterCount] = useState(0);

	const handleSelectChange = (
		e: React.ChangeEvent<HTMLSelectElement>
	): void => {
		const selectedValue = e.target.value;
		handleCellDataChange(row.uid, column.key, selectedValue);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>): void => {
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
				setEnterCount(2);
			} else {
				// Third Enter: Propagate normally
				setEnterCount(0);
			}
		}
	};

	return (
		<Select
			value={(row[column.key] || '') as string}
			onChange={handleSelectChange}
			onKeyDown={handleKeyDown}
			onFocus={() => {
				setActiveCell({ row: rowIndex, col: colIndex });
				setEnterCount(0);
			}}
			selectRef={(el) =>
				(inputRefs.current[`${rowIndex}-${colIndex}`] = el)
			}
			options={options}
		/>
	);
};

export default DropdownCell;
