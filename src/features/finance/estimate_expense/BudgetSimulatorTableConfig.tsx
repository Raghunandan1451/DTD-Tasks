import { ColumnConfig } from "@src/lib/types/table";
import { SimulatedExpense } from "@src/lib/types/finance";
import ActionButtons from "@src/components/shared/table/ActionButtons";

export const createBudgetSimulatorColumns =
	(): ColumnConfig<SimulatedExpense>[] => [
		{
			key: "name",
			label: "Name",
			width: "flex-1",
			render: (item) => (
				<div
					className="truncate text-gray-800 dark:text-gray-200"
					title={item.name}
				>
					{item.name}
				</div>
			),
		},
		{
			key: "quantity",
			label: "Quantity",
			width: "w-30",
			render: (item) => (
				<div className="truncate">
					{item.quantity && item.unit
						? `${item.quantity} ${item.unit}`
						: "-"}
				</div>
			),
		},
		{
			key: "amount",
			label: "Amount",
			width: "w-40",
			render: (item) => (
				<div className="font-medium text-red-700 dark:text-red-400">
					{item.amount.toFixed(2)}
				</div>
			),
		},
		{
			key: "actions",
			label: "Actions",
			width: "w-20",
			render: (item, _isEditing, _editForm, handlers) => (
				<ActionButtons
					isEditing={false}
					isProtected={false}
					onSave={() => {}}
					onCancel={() => {}}
					onEdit={() => {}}
					onDelete={() =>
						handlers.handleDelete(item.id, item.name, false)
					}
				/>
			),
		},
	];
