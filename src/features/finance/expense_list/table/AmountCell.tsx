import { FC } from "react";
import { ExpenseEntry } from "@src/features/finance/type";
import Input from "@src/components/ui/input/Input";

interface AmountCellProps {
	expense: ExpenseEntry;
	editForm: ExpenseEntry | null;
	isEditing: boolean;
	onEditChange: (field: keyof ExpenseEntry, value: string | number) => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
}

/** Amount cell for an expense row, read-only or editable. Extracted from ExpenseRow.tsx. */
const AmountCell: FC<AmountCellProps> = ({
	expense,
	editForm,
	isEditing,
	onEditChange,
	onKeyDown,
}) => {
	if (isEditing) {
		return (
			<Input
				id={`amount-${expense.id}`}
				type="number"
				value={editForm?.amount || ""}
				onChange={(e) => onEditChange("amount", e.target.value)}
				className="w-full text-sm"
				step="0.01"
				onKeyDown={onKeyDown}
			/>
		);
	}

	return (
		<div
			className={`font-medium ${expense.type === "Cr" ? "text-green-700" : ""}`}
		>
			{expense.amount.toFixed(2)}
		</div>
	);
};

export default AmountCell;
