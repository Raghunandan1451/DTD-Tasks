import { useEffect, useState } from 'react';
import { useTableContext } from '@components/Table/TableContext';

const Dropdown = ({ column, row, rowIndex, colIndex }) => {
	const { handleCellDataChange, setActiveCell, inputRefs } =
		useTableContext();
	const [isOpen, setIsOpen] = useState(false);
	const [focusedIndex, setFocusedIndex] = useState(-1);

	const options = column.options || [];

	const toggleDropdown = () => setIsOpen((prev) => !prev);
	const closeDropdown = () => setIsOpen(false);

	const handleKeyDown = (e) => {
		if (e.key === 'ArrowDown') {
			setFocusedIndex((prev) => (prev + 1) % options.length);
			setIsOpen(true);
		} else if (e.key === 'ArrowUp') {
			setFocusedIndex(
				(prev) => (prev - 1 + options.length) % options.length
			);
			setIsOpen(true);
		} else if (e.key === 'Enter' && focusedIndex >= 0) {
			handleSelect(options[focusedIndex]);
		} else if (e.key === 'Escape') {
			closeDropdown();
		}
	};

	const handleSelect = (value) => {
		handleCellDataChange(row.uid, column.key, value);
		closeDropdown();
	};

	const handleBlur = () => setTimeout(closeDropdown, 100); // Prevent immediate close on option click.

	useEffect(() => {
		if (isOpen) setFocusedIndex(-1); // Reset focusedIndex when dropdown opens.
	}, [isOpen]);

	return (
		<div
			ref={(el) => (inputRefs.current[`${rowIndex}-${colIndex}`] = el)}
			tabIndex={0}
			onFocus={() => {
				setActiveCell({ row: rowIndex, col: colIndex });
				toggleDropdown();
			}}
			onKeyDown={handleKeyDown}
			onBlur={handleBlur}
			className="relative w-full cursor-pointer bg-transparent outline-none">
			<div className="px-2 py-1">
				{row[column.key] || 'Select an option'}
			</div>
			{isOpen && (
				<ul className="absolute left-0 top-full z-10 w-full bg-black shadow-lg max-h-40 overflow-y-auto">
					{options.map((option, index) => (
						<li
							key={option}
							onClick={() => handleSelect(option)}
							className={`px-2 py-1 hover:bg-blue-500 hover:text-white cursor-pointer ${
								focusedIndex === index
									? 'bg-blue-500 text-white'
									: ''
							}`}>
							{option}
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export default Dropdown;
