import React from "react";
import Button from "@src/components/ui/button/Button";
import type { TimelineFilter } from "@src/features/home/lib/timelineTypes";

const OPTIONS: { value: TimelineFilter; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "journal", label: "Journal" },
	{ value: "expenses", label: "Expenses" },
	{ value: "files", label: "Files" },
];

interface FilterChipsProps {
	value: TimelineFilter;
	onChange: (filter: TimelineFilter) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({ value, onChange }) => (
	<div
		role="group"
		aria-label="Filter timeline"
		className="flex flex-wrap items-center gap-2"
	>
		{OPTIONS.map((option) => {
			const selected = option.value === value;
			return (
				<Button
					key={option.value}
					type="button"
					text={option.label}
					aria-pressed={selected}
					onClick={() => onChange(option.value)}
					className={`rounded-full border px-3 py-1 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
						selected ? "btn-glass-selected" : "btn-glass-unselected"
					}`}
				/>
			);
		})}
	</div>
);

export default FilterChips;
