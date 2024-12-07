import CellType from './CellType';
import { useTableContext } from './TableContext';

const TableRow = ({ row, rowIndex, columns }) => {
	const { activeCell } = useTableContext();
	return (
		<tr key={rowIndex} className="hover:bg-grey-400 transition-colors">
			<td className={`py-1 px-2 border`}>{rowIndex + 1}</td>
			{columns.map((column, colIndex) => {
				const isActive =
					activeCell.row === rowIndex && activeCell.col === colIndex;

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
			})}
		</tr>
	);
};

export default TableRow;
