import { JSX } from "react";
import { ColumnConfig, TableHandlers, TableRowRef } from "@src/lib/types/table";

interface GenericTableRowProps<T> {
	item: T;
	columns: ColumnConfig<T>[];
	editingId: string | null;
	editForm: T | null;
	editRowRef?: TableRowRef;
	handlers: TableHandlers<T>;
	getRowId: (item: T) => string;
	getRowClassName?: (item: T, isEditing: boolean) => string;
}

const GenericTableRow = <T,>({
	item,
	columns,
	editingId,
	editForm,
	editRowRef,
	handlers,
	getRowId,
	getRowClassName,
}: GenericTableRowProps<T>): JSX.Element => {
	const itemId = getRowId(item);
	const isEditing = editingId === itemId;

	const defaultRowClassName = `border-b border-white/20 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/5 transition-all duration-300`;
	const customRowClassName = getRowClassName
		? getRowClassName(item, isEditing)
		: "";

	return (
		<tr
			ref={isEditing ? editRowRef : null}
			className={`${defaultRowClassName} ${customRowClassName}`}
		>
			{columns.map((column) => (
				<td key={column.key} className={`px-2 py-1 ${column.width}`}>
					{column.render(item, isEditing, editForm, handlers)}
				</td>
			))}
		</tr>
	);
};

export default GenericTableRow;
