import {
	DEFAULT_GAP_X,
	DEFAULT_GAP_Y,
	maxSize,
	type LayoutEdge,
	type LayoutNode,
	type LayoutOptions,
	type Positions,
} from "@src/features/nodes/lib/layout/types";

export interface SpanningTree {
	/** Roots in layout order: the chosen root first, then one per unreached part. */
	roots: string[];
	children: Map<string, string[]>;
	/** Edge ids that are not part of the tree (drawn dashed). */
	crossLinks: Set<string>;
}

/**
 * Breadth-first spanning forest following edge direction. Nodes the root cannot
 * reach start their own trees, so every node is placed. Deterministic: ties
 * resolve in node and edge input order.
 */
export const buildSpanningTree = (
	nodes: readonly LayoutNode[],
	edges: readonly LayoutEdge[],
	rootId?: string | null,
): SpanningTree => {
	const ids = new Set(nodes.map((n) => n.id));
	const outgoing = new Map<string, LayoutEdge[]>();
	for (const edge of edges) {
		if (!ids.has(edge.source) || !ids.has(edge.target)) continue;
		const list = outgoing.get(edge.source) ?? [];
		list.push(edge);
		outgoing.set(edge.source, list);
	}

	const children = new Map<string, string[]>();
	const treeEdges = new Set<string>();
	const visited = new Set<string>();
	const roots: string[] = [];

	const grow = (start: string) => {
		roots.push(start);
		visited.add(start);
		const queue = [start];
		for (let head = 0; head < queue.length; head++) {
			const current = queue[head];
			for (const edge of outgoing.get(current) ?? []) {
				if (visited.has(edge.target)) continue;
				visited.add(edge.target);
				treeEdges.add(edge.id);
				children.set(current, [...(children.get(current) ?? []), edge.target]);
				queue.push(edge.target);
			}
		}
	};

	if (rootId && ids.has(rootId)) grow(rootId);
	// Prefer starting leftover trees at nodes nothing points to.
	const hasIncoming = new Set(edges.map((e) => e.target));
	for (const node of nodes) if (!visited.has(node.id) && !hasIncoming.has(node.id)) grow(node.id);
	for (const node of nodes) if (!visited.has(node.id)) grow(node.id);

	const crossLinks = new Set<string>();
	for (const edge of edges) if (!treeEdges.has(edge.id)) crossLinks.add(edge.id);
	return { roots, children, crossLinks };
};

/** Top-down tree: depth sets the row, leaves are spaced evenly, parents sit over their children. */
export const layoutTree = (
	nodes: readonly LayoutNode[],
	edges: readonly LayoutEdge[],
	rootId?: string | null,
	options: LayoutOptions = {},
): Positions => {
	const { gapX = DEFAULT_GAP_X, gapY = DEFAULT_GAP_Y } = options;
	const cell = maxSize(nodes);
	const slot = cell.width + gapX;
	const rowHeight = cell.height + gapY;
	const { roots, children } = buildSpanningTree(nodes, edges, rootId);

	const positions: Positions = {};
	let nextLeaf = 0;

	// Iterative post-order, so a long chain cannot overflow the call stack.
	const place = (root: string) => {
		const stack: { id: string; depth: number; expanded: boolean }[] = [
			{ id: root, depth: 0, expanded: false },
		];
		while (stack.length > 0) {
			const frame = stack[stack.length - 1];
			const kids = children.get(frame.id) ?? [];
			if (!frame.expanded && kids.length > 0) {
				frame.expanded = true;
				for (let i = kids.length - 1; i >= 0; i--) {
					stack.push({ id: kids[i], depth: frame.depth + 1, expanded: false });
				}
				continue;
			}
			stack.pop();
			const x =
				kids.length === 0
					? nextLeaf++ * slot
					: (positions[kids[0]].x + positions[kids[kids.length - 1]].x) / 2;
			positions[frame.id] = { x, y: frame.depth * rowHeight };
		}
	};

	for (const root of roots) place(root);
	return positions;
};
