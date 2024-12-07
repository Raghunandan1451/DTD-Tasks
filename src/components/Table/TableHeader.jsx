const TableHeader = ({ columns }) => (
	<thead className="bg-orange-500 sticky top-0">
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

export default TableHeader;
