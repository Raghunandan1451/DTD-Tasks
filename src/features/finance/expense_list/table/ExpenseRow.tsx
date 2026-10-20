// src/features/finance/expense_list/ExpenseRow.tsx
import { FC } from "react";
import { ExpenseEntry, TableRowRef } from "@src/features/finance/type";
import { TableHandlers } from "@src/lib/types/table";
import ExpenseRowActions from "@src/features/finance/expense_list/table/ExpenseRowActions";
import NameCell from "@src/features/finance/expense_list/table/NameCell";
import QuantityCell from "@src/features/finance/expense_list/table/QuantityCell";
import AmountCell from "@src/features/finance/expense_list/table/AmountCell";
import GroupCell from "@src/features/finance/expense_list/table/GroupCell";
import TypeBadge from "@src/features/finance/expense_list/table/TypeBadge";

interface ExpenseRowProps {
	expense: ExpenseEntry;
	groups: string[];
	editingId: string | null;
	editForm: ExpenseEntry | null;
	editRowRef?: TableRowRef;
	handlers: TableHandlers<ExpenseEntry>;
}

/**
 * Row layout only -- each field's editable/read-only rendering lives in
 * its own cell component under expense_list/table/. Previously this file
 * contained all five fields' markup inline (~190 lines); splitting them
 * out means a future change to e.g. how Amount renders never touches
 * this file or risks affecting Name/Group/etc.
 */
const ExpenseRow: FC<ExpenseRowProps> = ({
	expense,
	groups,
	editingId,
	editForm,
	editRowRef,
	handlers,
}) => {
	const { handleEditChange, handleKeyDown, displayQuantity } = handlers;
	const isEditing = editingId === expense.id;

	return (
		<tr
			ref={isEditing ? editRowRef : null}
			className={`border-b border-white/20 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/5 transition-all duration-300 ${
				isEditing
					? "bg-blue-500/20 dark:bg-blue-500/15 backdrop-blur-md"
					: expense.type === "Cr"
						? "bg-green-500/10 dark:bg-green-500/5"
						: ""
			}`}
		>
			<td className="px-2 py-1 w-[35%]">
				<NameCell
					expense={expense}
					editForm={editForm}
					isEditing={isEditing}
					onEditChange={handleEditChange}
					onKeyDown={handleKeyDown}
				/>
			</td>

			<td className="px-2 py-1 w-[10%]">
				<QuantityCell
					expense={expense}
					editForm={editForm}
					isEditing={isEditing}
					displayQuantity={displayQuantity}
					onEditChange={handleEditChange}
					onKeyDown={handleKeyDown}
				/>
			</td>

			<td className="px-2 py-1 w-[13%]">
				<AmountCell
					expense={expense}
					editForm={editForm}
					isEditing={isEditing}
					onEditChange={handleEditChange}
					onKeyDown={handleKeyDown}
				/>
			</td>

			<td className="px-2 py-1 w-[13%]">
				<GroupCell
					expense={expense}
					editForm={editForm}
					groups={groups}
					isEditing={isEditing}
					onEditChange={handleEditChange}
					onKeyDown={handleKeyDown}
				/>
			</td>

			<td className="px-2 py-1 w-[7%]">
				<TypeBadge type={expense.type} />
			</td>

			<td className="px-2 py-1 w-[12%]">
				<ExpenseRowActions
					expense={expense}
					isEditing={isEditing}
					handlers={handlers}
				/>
			</td>
		</tr>
	);
};

export default ExpenseRow;
