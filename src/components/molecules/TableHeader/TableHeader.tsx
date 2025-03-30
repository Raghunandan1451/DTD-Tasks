import { useTableContext } from '@src/hooks/useTableContext';
import React from 'react';
import { Column } from '@src/components/shared/table';

interface TableHeaderProps {
	columns: Column[];
}

const TableHeader: React.FC<TableHeaderProps> = ({ columns }) => {
	const { cellRef } = useTableContext();
	return (
		<thead className="bg-orange-600 sticky top-0" ref={cellRef}>
			<tr>
				<th className="py-1 px-2 text-left font-semibold border w-1/12">
					S. No.
				</th>
				{columns.map((column) => (
					<th
						key={column.key}
						className={`py-1 px-2 text-left font-semibold border ${column.className}`}>
						{column.header}
					</th>
				))}
			</tr>
		</thead>
	);
};

export default TableHeader;
