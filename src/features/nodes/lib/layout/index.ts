import type { BoardLayoutMode } from "@src/lib/db/types";
import { layoutGraph } from "@src/features/nodes/lib/layout/graph";
import { layoutGrid } from "@src/features/nodes/lib/layout/grid";
import { buildSpanningTree, layoutTree } from "@src/features/nodes/lib/layout/tree";
import type {
	GridHeader,
	LayoutEdge,
	LayoutNode,
	Positions,
	Size,
} from "@src/features/nodes/lib/layout/types";

export { layoutGraph, layoutGrid, layoutTree, buildSpanningTree };
export type { GridHeader, LayoutEdge, LayoutNode, Positions, Size };

export interface ComputedLayout {
	positions: Positions;
	/** Edge ids to draw dashed. Only the tree layout has any. */
	crossLinks: ReadonlySet<string>;
	/** Grid only: each node's size in the table (its column width by its row height). */
	sizes?: Record<string, Size>;
	/** Grid only: the row and column name cells. */
	headers?: GridHeader[];
}

const NO_LINKS: ReadonlySet<string> = new Set();

/** Positions for a non-free mode. "free" has none: it uses the saved positions. */
export const computeLayout = (
	mode: BoardLayoutMode,
	nodes: readonly LayoutNode[],
	edges: readonly LayoutEdge[],
	treeRootId?: string | null,
	gridColumns?: number,
	gridLabels: { rows?: readonly string[]; columns?: readonly string[]; corner?: string } = {},
): ComputedLayout | null => {
	switch (mode) {
		case "grid": {
			const grid = layoutGrid(nodes, {
				columns: gridColumns,
				rowLabels: gridLabels.rows,
				columnLabels: gridLabels.columns,
				cornerLabel: gridLabels.corner,
			});
			return { ...grid, crossLinks: NO_LINKS };
		}
		case "graph":
			return { positions: layoutGraph(nodes, edges), crossLinks: NO_LINKS };
		case "tree":
			return {
				positions: layoutTree(nodes, edges, treeRootId),
				crossLinks: buildSpanningTree(nodes, edges, treeRootId).crossLinks,
			};
		default:
			return null;
	}
};
