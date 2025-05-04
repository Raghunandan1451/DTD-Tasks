import React from 'react';

import { useTableContext } from '@src/hooks/useTableContext';
import CellSelector from '@src/components/molecules/TableCell/CellSelector';
import { Column, RowData } from '@src/components/shared/table';

interface TableCellProps {
	rowIndex: number;
	row: RowData;
	columns: Column[];
}

const TableRow: React.FC<TableCellProps> = ({ row, rowIndex, columns }) => {
	const { activeCell } = useTableContext();

	const isDataRow = Object.keys(row).length > 0;

	return (
		<tr className="hover:bg-white/10 dark:hover:bg-gray-700/30 transition-colors">
			<td className="py-1 px-2 border text-center">{rowIndex + 1}</td>
			{columns.map((column, colIndex) => {
				if (isDataRow) {
					const isActive =
						activeCell.row === rowIndex &&
						activeCell.col === colIndex;
					return (
						<td
							key={column.key}
							className={`p-0 border-b border-white/10 ${
								isActive ? 'active' : ''
							} ${column.className}`}>
							<CellSelector
								columnType={column.type}
								row={row}
								column={column}
								rowIndex={rowIndex}
								colIndex={colIndex}
							/>
						</td>
					);
				} else {
					return (
						<td
							key={column.key}
							className={`p-0 border-b border-white/10 ${column.className}`}></td>
					);
				}
			})}
		</tr>
	);
};

export default TableRow;
