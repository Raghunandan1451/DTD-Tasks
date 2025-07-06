import React from "react";
import { useTableContext } from "@src/hooks/useTableContext";
import Input from "@src/components/shared/Input/Input";
import { BaseCellProps } from "@src/components/types/table";

const NumericInputCell: React.FC<BaseCellProps> = (props) => {
	const { column, row, rowIndex, colIndex } = props;
	const { handleCellDataChange, setActiveCell, inputRefs, showNotification } =
		useTableContext();

	const handleNumberChange = (
		e: React.ChangeEvent<HTMLInputElement>
	): void => {
		const value = parseFloat(e.target.value);

		if (value <= 0 && showNotification) {
			showNotification(
				"Negative numbers and zero are not allowed",
				"error"
			);
			return;
		}

		handleCellDataChange(row.uid, column.key, e.target.value);
	};

	return (
		<Input
			id={`numeric-${rowIndex}${colIndex}`}
			type="number"
			value={(row[column.key] || "") as string}
			onChange={handleNumberChange}
			onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })}
			inputRef={(el) =>
				(inputRefs.current[`${rowIndex}-${colIndex}`] = el)
			}
		/>
	);
};

export default NumericInputCell;
