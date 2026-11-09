import {
	DEFAULT_TABLE_GAP,
	COLUMN_HEADER_HEIGHT,
	ROW_HEADER_WIDTH,
	type GridHeader,
	type GridLayout,
	type LayoutNode,
	type LayoutOptions,
	type Size,
} from "@src/features/nodes/lib/layout/types";

export interface GridLayoutOptions extends LayoutOptions {
	/** Columns the node list is cut into. Default: ceil(sqrt(n)). */
	columns?: number;
	/** Names by index; missing or short means blank. */
	rowLabels?: readonly string[];
	columnLabels?: readonly string[];
	/** Title of the corner cell above the row names. */
	cornerLabel?: string;
}

/**
 * A table: row-major cells, every column as wide as its widest node and every
 * row as tall as its tallest. Each node is stretched to fill its cell, and a
 * header strip runs above the columns and left of the rows. Headers sit at
 * negative coordinates, so cell (0, 0) stays at the origin.
 */
export const layoutGrid = (
	nodes: readonly LayoutNode[],
	options: GridLayoutOptions = {},
): GridLayout => {
	const { gapX = DEFAULT_TABLE_GAP, gapY = DEFAULT_TABLE_GAP } = options;
	if (nodes.length === 0) return { positions: {}, sizes: {}, headers: [] };

	// A stored column count can outlive deleted cells; columns with no cell are not drawn.
	const columns = Math.max(
		1,
		Math.min(options.columns ?? Math.ceil(Math.sqrt(nodes.length)), nodes.length),
	);
	const rows = Math.ceil(nodes.length / columns);

	const columnWidths: number[] = Array.from({ length: columns }, () => 0);
	const rowHeights: number[] = Array.from({ length: rows }, () => 0);
	nodes.forEach((node, index) => {
		const column = index % columns;
		const row = Math.floor(index / columns);
		columnWidths[column] = Math.max(columnWidths[column], node.width);
		rowHeights[row] = Math.max(rowHeights[row], node.height);
	});

	const columnX: number[] = [];
	let x = 0;
	for (const width of columnWidths) {
		columnX.push(x);
		x += width + gapX;
	}
	const rowY: number[] = [];
	let y = 0;
	for (const height of rowHeights) {
		rowY.push(y);
		y += height + gapY;
	}

	const positions: GridLayout["positions"] = {};
	const sizes: Record<string, Size> = {};
	nodes.forEach((node, index) => {
		const column = index % columns;
		const row = Math.floor(index / columns);
		positions[node.id] = { x: columnX[column], y: rowY[row] };
		sizes[node.id] = { width: columnWidths[column], height: rowHeights[row] };
	});

	const headers: GridHeader[] = [
		{
			id: "grid-corner",
			axis: "corner",
			index: 0,
			label: options.cornerLabel ?? "",
			x: -(ROW_HEADER_WIDTH + gapX),
			y: -(COLUMN_HEADER_HEIGHT + gapY),
			width: ROW_HEADER_WIDTH,
			height: COLUMN_HEADER_HEIGHT,
		},
		...columnWidths.map(
			(width, index): GridHeader => ({
				id: `grid-column-${index}`,
				axis: "column",
				index,
				label: options.columnLabels?.[index] ?? "",
				x: columnX[index],
				y: -(COLUMN_HEADER_HEIGHT + gapY),
				width,
				height: COLUMN_HEADER_HEIGHT,
			}),
		),
		...rowHeights.map(
			(height, index): GridHeader => ({
				id: `grid-row-${index}`,
				axis: "row",
				index,
				label: options.rowLabels?.[index] ?? "",
				x: -(ROW_HEADER_WIDTH + gapX),
				y: rowY[index],
				width: ROW_HEADER_WIDTH,
				height,
			}),
		),
	];

	return { positions, sizes, headers };
};
