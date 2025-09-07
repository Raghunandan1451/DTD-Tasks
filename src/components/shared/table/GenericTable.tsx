import { JSX } from "react";
import { ColumnConfig, TableHandlers, TableRowRef } from "@src/lib/types/table";
import GenericTableHeader from "./GenericTableHeader";
import GenericTableRow from "./GenericTableRow";

interface GenericTableProps<T> {
	data: T[];
	columns: ColumnConfig<T>[];
	editingId: string | null;
	editForm: T | null;
	editRowRef?: TableRowRef;
	handlers: TableHandlers<T>;
	getRowId: (item: T) => string;
	getRowClassName?: (item: T, isEditing: boolean) => string;
	emptyMessage?: string;
	className?: string;
	sortData?: (data: T[]) => T[];
}

const GenericTable = <T,>({
	data,
	columns,
	editingId,
	editForm,
	editRowRef,
	handlers,
	getRowId,
	getRowClassName,
	emptyMessage = "No data available",
	className = "",
	sortData,
}: GenericTableProps<T>): JSX.Element => {
	const sortedData = sortData ? sortData(data) : data;

	return (
		<div
			className={`overflow-x-auto backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-xl shadow-xl ${className}`}
		>
			<table className="min-w-full text-sm">
				<GenericTableHeader columns={columns} />
				<tbody>
					{sortedData.length === 0 ? (
						<tr>
							<td
								colSpan={columns.length}
								className="px-2 py-8 text-center text-gray-600 dark:text-gray-400"
							>
								{emptyMessage}
							</td>
						</tr>
					) : (
						sortedData.map((item) => (
							<GenericTableRow
								key={getRowId(item)}
								item={item}
								columns={columns}
								editingId={editingId}
								editForm={editForm}
								editRowRef={editRowRef}
								handlers={handlers}
								getRowId={getRowId}
								getRowClassName={getRowClassName}
							/>
						))
					)}
				</tbody>
			</table>
		</div>
	);
};

export default GenericTable;
