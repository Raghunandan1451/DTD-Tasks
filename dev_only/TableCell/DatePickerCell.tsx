import React, { useState } from "react";
import { useTableContext } from "@src/hooks/useTableContext";
import Input from "@src/components/shared/Input/Input";
import { BaseCellProps } from "@src/components/types/table";

const DatePickerCell: React.FC<BaseCellProps> = (props) => {
	const { column, row, rowIndex, colIndex } = props;
	const { handleCellDataChange, setActiveCell, inputRefs, showNotification } =
		useTableContext();
	const [isError, setIsError] = useState(false);

	// Calculate the date range: today to one month from today
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const oneMonthFromToday = new Date();
	oneMonthFromToday.setMonth(oneMonthFromToday.getMonth() + 1);
	oneMonthFromToday.setHours(0, 0, 0, 0);

	const formatDateToISO = (date: Date): string =>
		date.toLocaleDateString("en-CA");

	const validateDate = (
		e: React.SyntheticEvent<HTMLInputElement>
	): boolean => {
		if (!showNotification) return true;

		const target = e.target as HTMLInputElement;
		const inputDate = new Date(target.value);
		inputDate.setHours(0, 0, 0, 0);

		if (isNaN(inputDate.getTime())) {
			showNotification("Please enter a valid date", "error");
			setIsError(true);
			e.preventDefault();
			e.stopPropagation();
			return false;
		}

		// Validate against min and max dates
		if (inputDate < today || inputDate > oneMonthFromToday) {
			showNotification(
				"Date cannot be earlier than today OR later than one month from today.",
				"error"
			);
			setIsError(true);
			e.preventDefault();
			e.stopPropagation();
			return false;
		} else {
			setIsError(false);
			setActiveCell({
				row: rowIndex,
				col: colIndex,
			});
			return true;
		}
	};

	const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		if (!showNotification) return;

		const date = new Date(e.target.value);

		if (isNaN(date.getTime())) {
			showNotification("Invalid date", "error");
			return;
		}

		const formattedDate = date.toLocaleDateString("en-CA"); // Format to YYYY-MM-DD
		handleCellDataChange(row.uid, column.key, formattedDate);
	};

	return (
		<Input
			id={`item-${rowIndex}${colIndex}`}
			type="date"
			value={(row[column.key] || "") as string}
			onChange={handleDateChange}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					validateDate(e);
				}
			}}
			onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })}
			inputRef={(el) =>
				(inputRefs.current[`${rowIndex}-${colIndex}`] = el)
			}
			className={`w-full bg-transparent outline-hidden ${
				isError ? "text-red-500" : ""
			}`}
			min={formatDateToISO(today)}
			max={formatDateToISO(oneMonthFromToday)}
		/>
	);
};

export default DatePickerCell;
