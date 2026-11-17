import { useCallback } from "react";
import type { BoardNodeType, BoardShape } from "@src/lib/db/types";
import { DEFAULT_NODE_SIZE } from "@src/features/nodes/lib/constants";
import { DEFAULT_BOARD_COLOR } from "@src/features/nodes/lib/palette";
import { newId } from "@src/lib/db/newId";
import {
	childrenOf,
	descendantsOf,
	indent,
	moveInList,
	moveSibling,
	outdent,
	parentMap,
	reparent,
	treeRows,
} from "@src/features/nodes/lib/structure";
import { fromBoardNode, type FlowEdge, type FlowNode } from "@src/features/nodes/lib/serialize";
import { makeEdge, snap, type LayoutMeta, type Mutate } from "@src/features/nodes/lib/boardEditorShared";

interface StructureActionDeps {
	mutate: Mutate;
	nodesRef: { readonly current: FlowNode[] };
	edgesRef: { readonly current: FlowEdge[] };
	metaRef: { readonly current: LayoutMeta };
	onNoticeRef: { readonly current: ((message: string) => void) | undefined };
	/** Adds a top-level node of this type (from useBoardEditor). */
	addNode: (type: BoardNodeType) => string;
}

/** Parent/child, sibling and link actions for the structure panel and drag-and-drop. */
export const useStructureActions = ({
	mutate,
	nodesRef,
	edgesRef,
	metaRef,
	onNoticeRef,
	addNode,
}: StructureActionDeps) => {
	const refuse = useCallback((reason: string) => onNoticeRef.current?.(reason), [onNoticeRef]);

	/** Adds a node linked from `parentId`, as its index-th child (last by default). */
	const addChild = useCallback(
		(
			parentId: string,
			type: BoardNodeType = "shape",
			options: { index?: number; shape?: BoardShape } = {},
		): string => {
			const parent = nodesRef.current.find((node) => node.id === parentId);
			const size = DEFAULT_NODE_SIZE[type];
			const id = newId();
			const node: FlowNode = {
				...fromBoardNode({
					id,
					type,
					position: {
						x: snap(parent?.position.x ?? 0),
						y: snap(
							(parent?.position.y ?? 0) + (parent?.height ?? DEFAULT_NODE_SIZE.shape.height) + 48,
						),
					},
					width: size.width,
					height: size.height,
					data: {
						color: DEFAULT_BOARD_COLOR,
						...(type === "shape" ? { shape: options.shape ?? "rounded" } : {}),
					},
				}),
				selected: true,
			};
			mutate((currentNodes, currentEdges) => {
				const linked = reparent(currentEdges, id, parentId, makeEdge, options.index);
				return {
					nodes: [...currentNodes.map((n) => (n.selected ? { ...n, selected: false } : n)), node],
					edges: linked.ok ? linked.edges : currentEdges,
				};
			});
			return id;
		},
		[mutate, nodesRef],
	);

	/** Adds a node right after `id` under the same parent (or as a new top-level node). */
	const addSibling = useCallback(
		(id: string, type: BoardNodeType = "shape"): string => {
			const parent = parentMap(edgesRef.current).get(id);
			if (!parent) return addNode(type);
			const index = childrenOf(edgesRef.current, parent).indexOf(id) + 1;
			return addChild(parent, type, { index });
		},
		[addChild, addNode, edgesRef],
	);

	/** Makes `id` a child of `parentId` (or top level when null). Refuses loops. */
	const reparentNode = useCallback(
		(id: string, parentId: string | null, index?: number) => {
			mutate((_nodes, current) => {
				const result = reparent(current, id, parentId, makeEdge, index);
				if (!result.ok) {
					refuse(result.reason);
					return {};
				}
				return { edges: result.edges };
			});
		},
		[mutate, refuse],
	);

	const indentNode = useCallback(
		(id: string) => {
			mutate((currentNodes, current) => {
				const rows = treeRows(currentNodes, current, metaRef.current.treeRootId);
				const result = indent(current, id, makeEdge, rows);
				if (!result.ok) {
					refuse(result.reason);
					return {};
				}
				return { edges: result.edges };
			});
		},
		[mutate, refuse, metaRef],
	);

	const outdentNode = useCallback(
		(id: string) => {
			mutate((_nodes, current) => {
				const result = outdent(current, id, makeEdge);
				if (!result.ok) {
					refuse(result.reason);
					return {};
				}
				return { edges: result.edges };
			});
		},
		[mutate, refuse],
	);

	/** Tree: swap with the previous/next sibling. Other types: move in the node list. */
	const moveNode = useCallback(
		(id: string, direction: -1 | 1) => {
			if (metaRef.current.layoutMode === "tree") {
				mutate((_nodes, current) => ({
					edges: moveSibling(current, id, direction),
				}));
			} else {
				mutate((current) => ({ nodes: moveInList(current, id, direction) }));
			}
		},
		[mutate, metaRef],
	);

	/** Adds a link source -> target. In a tree this re-parents the target instead. */
	const link = useCallback(
		(source: string, target: string) => {
			if (source === target) return;
			mutate((_nodes, current) => {
				if (current.some((edge) => edge.source === source && edge.target === target)) return {};
				if (metaRef.current.layoutMode === "tree") {
					const result = reparent(current, target, source, makeEdge);
					if (!result.ok) {
						refuse(result.reason);
						return {};
					}
					return { edges: result.edges };
				}
				return { edges: [...current, makeEdge(source, target)] };
			});
		},
		[mutate, refuse, metaRef],
	);

	const unlink = useCallback(
		(source: string, target: string) => {
			mutate((_nodes, current) => ({
				edges: current.filter((edge) => !(edge.source === source && edge.target === target)),
			}));
		},
		[mutate],
	);

	/** Removes nodes and every link to or from them in one step. */
	const removeNodes = useCallback(
		(ids: readonly string[]) => {
			const gone = new Set(ids);
			mutate((currentNodes, currentEdges) => ({
				nodes: currentNodes.filter((node) => !gone.has(node.id)),
				edges: currentEdges.filter((edge) => !gone.has(edge.source) && !gone.has(edge.target)),
			}));
		},
		[mutate],
	);

	/** Removes a node together with everything below it. */
	const removeSubtree = useCallback(
		(id: string) => removeNodes([id, ...descendantsOf(edgesRef.current, id)]),
		[removeNodes, edgesRef],
	);

	return {
		addChild,
		addSibling,
		reparentNode,
		indentNode,
		outdentNode,
		moveNode,
		link,
		unlink,
		removeNodes,
		removeSubtree,
	};
};
