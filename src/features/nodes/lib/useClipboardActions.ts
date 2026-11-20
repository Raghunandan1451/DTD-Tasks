import { useCallback, useRef } from "react";
import { PASTE_OFFSET } from "@src/features/nodes/lib/constants";
import { copySelection, pasteClipboard, type ClipboardData } from "@src/features/nodes/lib/clipboard";
import { fromBoardEdges, fromBoardNodes, toBoardEdges, toBoardNodes, type FlowEdge, type FlowNode } from "@src/features/nodes/lib/serialize";
import { type Mutate } from "@src/features/nodes/lib/boardEditorShared";

/** Shared across boards, so a selection can be copied from one and pasted into another. */
let clipboard: ClipboardData | null = null;

interface ClipboardDeps {
	mutate: Mutate;
	nodesRef: { current: FlowNode[] };
	edgesRef: { current: FlowEdge[] };
	selectedNodeIds: () => Set<string>;
}

/** Copy, paste and duplicate of the selection. */
export const useClipboardActions = ({ mutate, nodesRef, edgesRef, selectedNodeIds }: ClipboardDeps) => {
	const pasteCountRef = useRef(0);

	/** Adds copies, selects them, and deselects everything else. */
	const insertCopies = useCallback(
		(data: ClipboardData, offset: number) => {
			const copies = pasteClipboard(data, offset);
			mutate((currentNodes, currentEdges) => ({
				nodes: [
					...currentNodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
					...fromBoardNodes(copies.nodes).map((n) => ({
						...n,
						selected: true,
					})),
				],
				edges: [...currentEdges, ...fromBoardEdges(copies.edges)],
			}));
		},
		[mutate],
	);

	const copy = useCallback(() => {
		const data = copySelection(
			toBoardNodes(nodesRef.current),
			toBoardEdges(edgesRef.current),
			selectedNodeIds(),
		);
		if (!data) return;
		clipboard = data;
		pasteCountRef.current = 0;
	}, [selectedNodeIds, nodesRef, edgesRef]);

	const paste = useCallback(() => {
		if (!clipboard) return;
		pasteCountRef.current += 1;
		insertCopies(clipboard, PASTE_OFFSET * pasteCountRef.current);
	}, [insertCopies]);

	const duplicate = useCallback(() => {
		const data = copySelection(
			toBoardNodes(nodesRef.current),
			toBoardEdges(edgesRef.current),
			selectedNodeIds(),
		);
		if (data) insertCopies(data, PASTE_OFFSET);
	}, [insertCopies, selectedNodeIds, nodesRef, edgesRef]);

	return { copy, paste, duplicate };
};
