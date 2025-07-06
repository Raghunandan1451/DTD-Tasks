import { useTableContext } from "@src/hooks/useTableContext";
import React from "react";
import { Column } from "@src/components/types/table";

interface TableHeaderProps {
	columns: Column[];
}

const TableHeader: React.FC<TableHeaderProps> = ({ columns }) => {
	const { cellRef } = useTableContext();
	return (
		<thead
			className="bg-white/20 dark:bg-gray-700/40 backdrop-blur-md text-white"
			ref={cellRef}
		>
			<tr>
				<th className="py-1 px-2 text-left font-semibold border-b border-white/20 w-1/20">
					S. No.
				</th>
				{columns.map((column) => (
					<th
						key={column.key}
						className={`py-1 px-2 text-left font-semibold border-b border-white/20 ${column.className}`}
					>
						{column.header}
					</th>
				))}
			</tr>
		</thead>
	);
};

export default TableHeader;
