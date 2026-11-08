/*
 * Grid boards are a row-major list of nodes with a column count.
 * Rows = ceil(nodes / columns). A new grid board starts as 1 row x 1 column.
 */

export interface GridResult<T> {
	items: T[];
	columns: number;
	/** Items taken out, so the caller can drop links that touched them. */
	removed: T[];
}

/** Columns for a grid that has none stored: square-ish, like the old layout. */
export const defaultColumns = (count: number): number => Math.max(1, Math.ceil(Math.sqrt(count)));

/** Splits into rows of `columns`, padding the last row with new items so every row is full. */
const toRows = <T>(items: readonly T[], columns: number, make: () => T): T[][] => {
	const rows: T[][] = [];
	for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
	if (rows.length === 0) rows.push([]);
	for (const row of rows) while (row.length < columns) row.push(make());
	return rows;
};

export const addRow = <T>(items: readonly T[], columns: number, make: () => T): GridResult<T> => {
	const rows = toRows(items, columns, make);
	rows.push(Array.from({ length: columns }, make));
	return { items: rows.flat(), columns, removed: [] };
};

export const addColumn = <T>(
	items: readonly T[],
	columns: number,
	make: () => T,
): GridResult<T> => {
	const rows = toRows(items, columns, make);
	for (const row of rows) row.push(make());
	return { items: rows.flat(), columns: columns + 1, removed: [] };
};

/** Removes row `row` (0-based). The last remaining row is kept. */
export const removeRow = <T>(
	items: readonly T[],
	columns: number,
	row: number,
	make: () => T,
): GridResult<T> => {
	const rows = toRows(items, columns, make);
	if (rows.length <= 1 || row < 0 || row >= rows.length) {
		return { items: [...items], columns, removed: [] };
	}
	const [removed] = rows.splice(row, 1);
	return { items: rows.flat(), columns, removed };
};

/** Removes column `column` (0-based). The last remaining column is kept. */
export const removeColumn = <T>(
	items: readonly T[],
	columns: number,
	column: number,
	make: () => T,
): GridResult<T> => {
	if (columns <= 1 || column < 0 || column >= columns) {
		return { items: [...items], columns, removed: [] };
	}
	const rows = toRows(items, columns, make);
	const removed = rows.map((row) => row.splice(column, 1)[0]);
	return { items: rows.flat(), columns: columns - 1, removed };
};
