import CellType from '@components/Table/CellType';
import { useTableContext } from '@components/Table/TableContext';

const TableRow = ({ row, rowIndex, columns, showNotifications }) => {
	const { activeCell } = useTableContext();

	const isDataRow = Object.keys(row).length > 0; // Check if row contains data

	return (
		<tr className="hover:bg-gray-700 transition-colors">
			<td className={`py-1 px-2 border`}>{rowIndex + 1}</td>
			{columns.map((column, colIndex) => {
				if (isDataRow) {
					const isActive =
						activeCell.row === rowIndex &&
						activeCell.col === colIndex;

					return (
						<td
							key={column.key}
							className={`py-1 px-2 border ${
								isActive ? 'bg-zinc-700' : ''
							} ${column.className}`}>
							<CellType
								columnType={column.type}
								rowIndex={rowIndex}
								colIndex={colIndex}
								column={column}
								row={row}
								showNotifications={showNotifications}
							/>
						</td>
					);
				} else {
					return (
						<td
							key={column.key}
							className={`py-1 px-2 border ${column.className}`}></td>
					);
				}
			})}
		</tr>
	);
};

export default TableRow;
