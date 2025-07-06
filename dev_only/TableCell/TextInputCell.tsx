import React from "react";
import { useTableContext } from "@src/hooks/useTableContext";
import Input from "@src/components/shared/Input/Input";
import { BaseCellProps } from "@src/components/types/table";

const TextInputCell: React.FC<BaseCellProps> = (props) => {
	const { column, row, rowIndex, colIndex } = props;
	const { handleCellDataChange, setActiveCell, inputRefs } =
		useTableContext();

	return (
		<Input
			id={`text-${rowIndex}${colIndex}`}
			type="text"
			value={(row[column.key] || "") as string}
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
