import { newId } from "@src/lib/db/newId";
import type { BoardEdge, BoardNode } from "@src/lib/db/types";
import { PASTE_OFFSET } from "@src/features/nodes/lib/constants";

export interface ClipboardData {
	nodes: BoardNode[];
	edges: BoardEdge[];
}

/**
 * Copies the selected nodes and the edges that run between two of them.
 * Edges to nodes outside the selection are left behind. Returns null when
 * nothing is selected.
 */
export const copySelection = (
	nodes: readonly BoardNode[],
	edges: readonly BoardEdge[],
	selectedIds: ReadonlySet<string>,
): ClipboardData | null => {
	const picked = nodes.filter((node) => selectedIds.has(node.id));
	if (picked.length === 0) return null;
	return {
		nodes: structuredClone(picked),
		edges: structuredClone(
			edges.filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target)),
		),
	};
};

export interface PasteResult {
	nodes: BoardNode[];
	edges: BoardEdge[];
}

/**
 * Makes new copies with fresh ids, shifted by `offset`, with edges pointed at
 * the new nodes. Used for paste (offset grows on repeated pastes) and for
 * duplicate. The clipboard data itself is never changed.
 */
export const pasteClipboard = (
	data: ClipboardData,
	offset: number = PASTE_OFFSET,
	makeId: () => string = newId,
): PasteResult => {
	const idMap = new Map<string, string>();
	const nodes = structuredClone(data.nodes).map((node) => {
		const id = makeId();
		idMap.set(node.id, id);
		return {
			...node,
			id,
			position: { x: node.position.x + offset, y: node.position.y + offset },
		};
	});

	const edges = structuredClone(data.edges).flatMap((edge): BoardEdge[] => {
		const source = idMap.get(edge.source);
		const target = idMap.get(edge.target);
		return source && target ? [{ ...edge, id: makeId(), source, target }] : [];
	});

	return { nodes, edges };
};
