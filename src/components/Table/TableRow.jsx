import CellType from './CellType';
import { useTableContext } from './TableContext';

const TableRow = ({ row, rowIndex, columns }) => {
	const { activeCell } = useTableContext();

	const isDataRow = Object.keys(row).length > 0; // Check if row contains data

	return (
		<tr key={rowIndex} className="hover:bg-grey-400 transition-colors">
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
								isActive ? 'bg-blue-400' : ''
							} ${column.className}`}>
							<CellType
								columnType={column.type}
								rowIndex={rowIndex}
								colIndex={colIndex}
								column={column}
								row={row}
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
