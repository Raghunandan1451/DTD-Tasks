import { useState } from 'react';
import { useTableContext } from '../TableContext';

const DatePicker = (props) => {
	const { column, row, rowIndex, colIndex } = props;
	const { handleCellDataChange, setActiveCell, inputRefs } =
		useTableContext();
	const [isError, setIsError] = useState(false);

	// Calculate the date range: today to one month from today
	const today = new Date();
	const oneMonthFromToday = new Date();
	oneMonthFromToday.setMonth(oneMonthFromToday.getMonth() + 1);

	const formatDateToISO = (date) => date.toISOString().split('T')[0];

	const validateDate = (e) => {
		if (e.key === 'Enter') {
			const inputDate = new Date(e.target.value);
			// Validate against min and max dates
			if (inputDate < today || inputDate > oneMonthFromToday) {
				alert(
					'Date cannot be earlier than today OR later than one month from today.'
				);
				setIsError(true);
				e.preventDefault(); // Block default behavior
				e.stopPropagation(); // Stop further handling
			} else {
				setIsError(false);
				setActiveCell({
					row: rowIndex,
					col: colIndex,
				});
			}
		}
	};

	return (
		<input
			type="date"
			ref={(el) => (inputRefs.current[`${rowIndex}-${colIndex}`] = el)}
			value={row[column.key] || ''}
			onChange={(e) =>
				handleCellDataChange(rowIndex, column.key, e.target.value)
			}
			onKeyDown={validateDate}
			onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })}
			className={`w-full bg-transparent outline-none ${
				isError ? 'text-red-500' : ''
			}`}
			min={formatDateToISO(today)}
			max={formatDateToISO(oneMonthFromToday)}
		/>
	);
};

export default DatePicker;
