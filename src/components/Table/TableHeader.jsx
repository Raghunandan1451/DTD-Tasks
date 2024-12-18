import { useTableContext } from './TableContext';

const TableHeader = ({ columns }) => {
	const { cellRef } = useTableContext();
	return (
		<thead className="bg-orange-600 sticky top-0" ref={cellRef}>
			<tr>
				<th className="p-2 text-left font-semibold border w-1/12">
					S. No.
				</th>
				{columns.map((column) => (
					<th
						key={column.key}
						className={`p-2 text-left font-semibold border ${column.className}`}>
						{column.header}
					</th>
				))}
			</tr>
		</thead>
	);
};

export default TableHeader;
