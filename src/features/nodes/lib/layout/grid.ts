import {
	DEFAULT_GAP_X,
	DEFAULT_GAP_Y,
	maxSize,
	type LayoutNode,
	type LayoutOptions,
	type Positions,
} from "@src/features/nodes/lib/layout/types";

/** Row-major grid in input order. Columns default to ceil(sqrt(n)) unless given. */
export const layoutGrid = (
	nodes: readonly LayoutNode[],
	options: LayoutOptions & { columns?: number } = {},
): Positions => {
	const { gapX = DEFAULT_GAP_X, gapY = DEFAULT_GAP_Y } = options;
	const columns = Math.max(1, options.columns ?? Math.ceil(Math.sqrt(nodes.length)));
	const cell = maxSize(nodes);
	const positions: Positions = {};
	nodes.forEach((node, index) => {
		positions[node.id] = {
			x: (index % columns) * (cell.width + gapX),
			y: Math.floor(index / columns) * (cell.height + gapY),
		};
	});
	return positions;
};
