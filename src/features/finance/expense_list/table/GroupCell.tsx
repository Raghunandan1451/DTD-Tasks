import { FC } from "react";
import { ExpenseEntry } from "@src/features/finance/type";
import SimpleSelect from "@src/components/ui/select_dropdown/SimpleSelect";

interface GroupCellProps {
	expense: ExpenseEntry;
	editForm: ExpenseEntry | null;
	groups: string[];
	isEditing: boolean;
	onEditChange: (field: keyof ExpenseEntry, value: string | number) => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
}

/** Group cell for an expense row, read-only or editable. Extracted from ExpenseRow.tsx. */
const GroupCell: FC<GroupCellProps> = ({
	expense,
	editForm,
	groups,
	isEditing,
	onEditChange,
	onKeyDown,
}) => {
	if (isEditing) {
		return (
			<SimpleSelect
				id={`group-${expense.id}`}
				value={editForm?.group || ""}
				onChange={(e) => onEditChange("group", e.target.value)}
				options={groups}
				className="text-sm"
				onKeyDown={onKeyDown}
			/>
		);
	}

	return <div className="truncate">{expense.group}</div>;
};

export default GroupCell;
