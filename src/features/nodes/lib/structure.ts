import { buildSpanningTree } from "@src/features/nodes/lib/layout/tree";

/*
 * Pure structure helpers behind the right-hand panel and drag-and-drop.
 * "Parent" means the source of an incoming edge; sibling order is the order of
 * the parent's outgoing edges in the edge list (the same order the tree layout
 * uses), and node order is the order of the node list (what the grid uses).
 */

interface EdgeLike {
	id: string;
	source: string;
	target: string;
}

interface NodeLike {
	id: string;
}

export interface StructureRow {
	id: string;
	depth: number;
}

/** First incoming edge wins when old data gave a node several parents. */
export const parentMap = (edges: readonly EdgeLike[]): Map<string, string> => {
	const parents = new Map<string, string>();
	for (const edge of edges) if (!parents.has(edge.target)) parents.set(edge.target, edge.source);
	return parents;
};

/** Children of a node, in the order of its outgoing edges. */
export const childrenOf = (edges: readonly EdgeLike[], id: string): string[] =>
	edges.filter((edge) => edge.source === id).map((edge) => edge.target);

/** Outline rows for the tree panel: depth-first, same shape the layout draws. */
export const treeRows = (
	nodes: readonly NodeLike[],
	edges: readonly EdgeLike[],
	rootId?: string | null,
): StructureRow[] => {
	const layoutNodes = nodes.map((node) => ({
		id: node.id,
		width: 1,
		height: 1,
	}));
	const { roots, children } = buildSpanningTree(layoutNodes, edges, rootId);
	const rows: StructureRow[] = [];
	// Iterative so a very deep chain cannot overflow the stack.
	for (const root of roots) {
		const stack: StructureRow[] = [{ id: root, depth: 0 }];
		while (stack.length > 0) {
			const row = stack.pop() as StructureRow;
			rows.push(row);
			const kids = children.get(row.id) ?? [];
			for (let i = kids.length - 1; i >= 0; i--) stack.push({ id: kids[i], depth: row.depth + 1 });
		}
	}
	return rows;
};

/** Every node below `id`, not including it. */
export const descendantsOf = (edges: readonly EdgeLike[], id: string): string[] => {
	const seen = new Set<string>([id]);
	const found: string[] = [];
	const queue = [id];
	for (let head = 0; head < queue.length; head++) {
		for (const child of childrenOf(edges, queue[head])) {
			if (seen.has(child)) continue;
			seen.add(child);
			found.push(child);
			queue.push(child);
		}
	}
	return found;
};

/** True when pointing `source` at `target` would make a loop (target already leads to source). */
export const wouldCreateCycle = (
	edges: readonly EdgeLike[],
	source: string,
	target: string,
): boolean => source === target || descendantsOf(edges, target).includes(source);

/**
 * Inserts `edge` so it is the `index`-th outgoing edge of its source
 * (appended when index is missing or past the end).
 */
const insertEdgeAt = <E extends EdgeLike>(edges: readonly E[], edge: E, index?: number): E[] => {
	const next = [...edges];
	const siblings = next.filter((item) => item.source === edge.source);
	if (index === undefined || index >= siblings.length) return [...next, edge];
	const before = next.indexOf(siblings[Math.max(index, 0)]);
	next.splice(before, 0, edge);
	return next;
};

export type StructureResult<E> = { ok: true; edges: E[] } | { ok: false; reason: string };

/**
 * Moves `id` under `newParentId` (or to the top level when null) as the index-th
 * child. Any previous incoming edges are replaced, so the node keeps one parent.
 * Refuses loops.
 */
export const reparent = <E extends EdgeLike>(
	edges: readonly E[],
	id: string,
	newParentId: string | null,
	makeEdge: (source: string, target: string) => E,
	index?: number,
): StructureResult<E> => {
	if (newParentId !== null) {
		if (newParentId === id) return { ok: false, reason: "A node can't be its own parent." };
		if (wouldCreateCycle(edges, newParentId, id)) {
			return {
				ok: false,
				reason: "That would put a node under one of its own children.",
			};
		}
	}
	const kept = edges.filter((edge) => edge.target !== id);
	if (newParentId === null) return { ok: true, edges: kept };
	// Reuse the old edge (label, arrow, id) when the parent is unchanged.
	const old = edges.find((edge) => edge.target === id && edge.source === newParentId);
	return {
		ok: true,
		edges: insertEdgeAt(kept, old ?? makeEdge(newParentId, id), index),
	};
};

/** Makes `id` a child of the sibling just above it. Null when there is none. */
export const indent = <E extends EdgeLike>(
	edges: readonly E[],
	id: string,
	makeEdge: (source: string, target: string) => E,
	rows: readonly StructureRow[],
): StructureResult<E> => {
	const parent = parentMap(edges).get(id) ?? null;
	const siblings = parent
		? childrenOf(edges, parent)
		: rows.filter((r) => r.depth === 0).map((r) => r.id);
	const at = siblings.indexOf(id);
	if (at <= 0) return { ok: false, reason: "There is no node above to nest under." };
	return reparent(edges, id, siblings[at - 1], makeEdge);
};

/** Moves `id` up one level, to sit right after its former parent. */
export const outdent = <E extends EdgeLike>(
	edges: readonly E[],
	id: string,
	makeEdge: (source: string, target: string) => E,
): StructureResult<E> => {
	const parents = parentMap(edges);
	const parent = parents.get(id);
	if (!parent) return { ok: false, reason: "It is already at the top level." };
	const grand = parents.get(parent) ?? null;
	const index = grand ? childrenOf(edges, grand).indexOf(parent) + 1 : undefined;
	return reparent(edges, id, grand, makeEdge, index);
};

/** Swaps `id` with its previous (-1) or next (+1) sibling by reordering the parent's edges. */
export const moveSibling = <E extends EdgeLike>(
	edges: readonly E[],
	id: string,
	direction: -1 | 1,
): E[] => {
	const parent = parentMap(edges).get(id);
	if (!parent) return [...edges];
	const own = edges.filter((edge) => edge.source === parent);
	const at = own.findIndex((edge) => edge.target === id);
	const swap = at + direction;
	if (at < 0 || swap < 0 || swap >= own.length) return [...edges];
	const reordered = [...own];
	[reordered[at], reordered[swap]] = [reordered[swap], reordered[at]];
	// Put the reordered edges back into the slots the parent's edges used.
	let cursor = 0;
	return edges.map((edge) => (edge.source === parent ? reordered[cursor++] : edge));
};

/** Moves a node one place earlier (-1) or later (+1) in the node list. */
export const moveInList = <T extends NodeLike>(
	items: readonly T[],
	id: string,
	direction: -1 | 1,
): T[] => {
	const at = items.findIndex((item) => item.id === id);
	const swap = at + direction;
	if (at < 0 || swap < 0 || swap >= items.length) return [...items];
	const next = [...items];
	[next[at], next[swap]] = [next[swap], next[at]];
	return next;
};

/** Moves `id` so it sits where `targetId` is in the node list. */
export const moveToTarget = <T extends NodeLike>(
	items: readonly T[],
	id: string,
	targetId: string,
): T[] => {
	const from = items.findIndex((item) => item.id === id);
	const to = items.findIndex((item) => item.id === targetId);
	if (from < 0 || to < 0 || from === to) return [...items];
	const next = [...items];
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved);
	return next;
};
