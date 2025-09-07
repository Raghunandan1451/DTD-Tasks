import { JSX } from "react";
import { ColumnConfig } from "@src/lib/types/table";

interface GenericTableHeaderProps<T> {
	columns: ColumnConfig<T>[];
	className?: string;
}

const GenericTableHeader = <T,>({
	columns,
	className = "",
}: GenericTableHeaderProps<T>): JSX.Element => {
	return (
		<thead>
			<tr
				className={`backdrop-blur-md bg-white/20 dark:bg-white/10 border-b border-white/30 dark:border-white/20 ${className}`}
			>
				{columns.map((column) => (
					<th
						key={column.key}
						className={`text-left px-2 py-1 ${column.width}`}
					>
						{column.label}
					</th>
				))}
			</tr>
		</thead>
	);
};

export default GenericTableHeader;
