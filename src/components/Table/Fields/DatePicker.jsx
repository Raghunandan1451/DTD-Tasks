import { useState } from 'react';
import { useTableContext } from '@components/Table/TableContext';

const DatePicker = (props) => {
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

	const formatDateToISO = (date) => date.toISOString().split('T')[0];

	const validateDate = (e, showNotification) => {
		const inputDate = new Date(e.target.value);
		inputDate.setHours(0, 0, 0, 0);
		// Validate against min and max dates
		if (inputDate < today || inputDate > oneMonthFromToday) {
			showNotification(
				'Date cannot be earlier than today OR later than one month from today.',
				'error'
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
	};

	const handleDateChange = (e, showNotification) => {
		const date = new Date(e.target.value); // Convert string to Date object

		if (isNaN(date)) {
			// Ensure the date is valid
			showNotification('Invalid date', 'error');
			return; // Prevent further processing if the date is invalid
		}
		// Format the date as 'yyyy-MM-dd'
		const formattedDate = date.toISOString().split('T')[0]; // Extract only 'yyyy-MM-dd'
		// Pass the formatted date to the handler
		handleCellDataChange(row.uid, column.key, formattedDate);
	};

	return (
		<input
			type="date"
			ref={(el) => (inputRefs.current[`${rowIndex}-${colIndex}`] = el)}
			value={row[column.key] || ''}
			onChange={(e) => handleDateChange(e, showNotification)}
			onKeyDown={(e) => {
				if (e.key === 'Enter') {
					validateDate(e, showNotification);
				}
			}}
			onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })}
			className={`w-full bg-transparent outline-hidden ${
				isError ? 'text-red-500' : ''
			}`}
			min={formatDateToISO(today)}
			max={formatDateToISO(oneMonthFromToday)}
		/>
	);
};

export default DatePicker;
