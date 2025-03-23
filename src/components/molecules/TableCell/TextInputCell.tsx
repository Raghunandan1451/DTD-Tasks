import React from 'react';
import { useTableContext } from '@components/Table/TableContext';
import Input from '@src/components/atoms/Input/Input';
import { BaseCellProps } from '@components/shared/table';

const TextInputCell: React.FC<BaseCellProps> = (props) => {
	const { column, row, rowIndex, colIndex } = props;
	const { handleCellDataChange, setActiveCell, inputRefs } =
		useTableContext();

	return (
		<Input
			type="text"
			value={(row[column.key] || '') as string}
			onChange={(e) =>
				handleCellDataChange(row.uid, column.key, e.target.value)
			}
			onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })}
			inputRef={(el) =>
				(inputRefs.current[`${rowIndex}-${colIndex}`] = el)
			}
		/>
	);
};

export default TextInputCell;
