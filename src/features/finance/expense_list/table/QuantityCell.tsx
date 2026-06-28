import { FC } from "react";
import { ExpenseEntry } from "@src/features/finance/type";
import { TableHandlers } from "@src/lib/types/table";
import Input from "@src/components/ui/input/Input";
import SimpleSelect from "@src/components/ui/select_dropdown/SimpleSelect";

interface QuantityCellProps {
	expense: ExpenseEntry;
	editForm: ExpenseEntry | null;
	isEditing: boolean;
	displayQuantity: TableHandlers<ExpenseEntry>["displayQuantity"];
	onEditChange: (field: keyof ExpenseEntry, value: string | number) => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
}

/**
 * Quantity + unit cell for an expense row, read-only or editable.
 * Extracted from ExpenseRow.tsx.
 *
 * displayQuantity is optional on TableHandlers<T> (BudgetSimulatorTable's
 * handlers never define it), so this falls back to "-" when it's missing
 * rather than calling a possibly-undefined function -- that fallback is
 * what fixes the "Cannot invoke an object which is possibly 'undefined'"
 * error that ExpenseRow.tsx hit by calling it unconditionally.
 */
const QuantityCell: FC<QuantityCellProps> = ({
	expense,
	editForm,
	isEditing,
	displayQuantity,
	onEditChange,
	onKeyDown,
}) => {
	if (expense.type === "Cr") {
		return <div className="truncate">N/A</div>;
	}

	if (isEditing) {
		return (
			<div className="flex gap-1">
				<Input
					id={`quantity-${expense.id}`}
					type="number"
					value={editForm?.quantity || ""}
					onChange={(e) => onEditChange("quantity", e.target.value)}
					className="w-12 text-sm"
					onKeyDown={onKeyDown}
				/>
				<SimpleSelect
					id={`unit-${expense.id}`}
					value={editForm?.unit || ""}
					onChange={(e) => onEditChange("unit", e.target.value)}
					options={["pc(s)", "kg", "lt", "g", "ml"]}
					className="text-xs"
					onKeyDown={onKeyDown}
				/>
			</div>
		);
	}

	const label = displayQuantity
		? displayQuantity(expense.quantity, expense.unit)
		: "-";

	return <div className="truncate">{label}</div>;
};

export default QuantityCell;
