import type { BoardLayoutMode } from "@src/lib/db/types";
import { layoutGraph } from "@src/features/nodes/lib/layout/graph";
import { layoutGrid } from "@src/features/nodes/lib/layout/grid";
import { buildSpanningTree, layoutTree } from "@src/features/nodes/lib/layout/tree";
import type { LayoutEdge, LayoutNode, Positions } from "@src/features/nodes/lib/layout/types";

export { layoutGraph, layoutGrid, layoutTree, buildSpanningTree };
export type { LayoutEdge, LayoutNode, Positions };

export interface ComputedLayout {
	positions: Positions;
	/** Edge ids to draw dashed. Only the tree layout has any. */
	crossLinks: ReadonlySet<string>;
}

const NO_LINKS: ReadonlySet<string> = new Set();

/** Positions for a non-free mode. "free" has none: it uses the saved positions. */
export const computeLayout = (
	mode: BoardLayoutMode,
	nodes: readonly LayoutNode[],
	edges: readonly LayoutEdge[],
	treeRootId?: string | null,
	gridColumns?: number,
): ComputedLayout | null => {
	switch (mode) {
		case "grid":
			return {
				positions: layoutGrid(nodes, { columns: gridColumns }),
				crossLinks: NO_LINKS,
			};
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
