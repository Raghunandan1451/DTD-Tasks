// src/features/finance/expense_section/components/GroupFilter.tsx
import React from "react";
import SimpleSelect from "@src/components/ui/select_dropdown/SimpleSelect";

interface GroupFilterProps {
	groups: string[];
	selectedGroup: string | null;
	onChangeGroup: (group: string | null) => void;
}

const GroupFilter: React.FC<GroupFilterProps> = ({
	groups,
	selectedGroup,
	onChangeGroup,
}) => {
	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const value = e.target.value;
		onChangeGroup(value === "All" ? null : value);
	};

	// Add "All" option to the groups
	const groupOptions = ["All", ...groups];

	return (
		<div className="w-full sm:w-auto">
			<SimpleSelect
				id="group-filter"
				value={selectedGroup ?? "All"}
				onChange={handleChange}
				options={groupOptions}
				// placeholder="Filter by group"
			/>
		</div>
	);
};

export default GroupFilter;
