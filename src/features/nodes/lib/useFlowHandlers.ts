import { useCallback } from "react";
import { applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange, type Viewport } from "@xyflow/react";
import { type Snapshot } from "@src/features/nodes/lib/history";
import { reparent } from "@src/features/nodes/lib/structure";
import { type FlowEdge, type FlowNode } from "@src/features/nodes/lib/serialize";
import { type DirtyKind } from "@src/features/nodes/lib/useAutosave";
import { makeEdge, sameViewport, type LayoutMeta, type Mutate } from "@src/features/nodes/lib/boardEditorShared";

interface FlowHandlerDeps {
	mutate: Mutate;
	setNodes: (next: FlowNode[]) => void;
	setEdges: (next: FlowEdge[]) => void;
	snapshot: () => Snapshot;
	beginBatch: () => void;
	commitGesture: () => void;
	nodesRef: { current: FlowNode[] };
	edgesRef: { current: FlowEdge[] };
	metaRef: { current: LayoutMeta };
	gestureRef: { current: Snapshot | null };
	viewportRef: { current: Viewport };
	onDirtyRef: { current: (kind: DirtyKind) => void };
	onNoticeRef: { current: ((message: string) => void) | undefined };
}

/** React Flow's change events, turned into board edits (drags, edges, connections). */
export const useFlowHandlers = ({
	mutate,
	setNodes,
	setEdges,
	snapshot,
	beginBatch,
	commitGesture,
	nodesRef,
	edgesRef,
	metaRef,
	gestureRef,
	viewportRef,
	onDirtyRef,
	onNoticeRef,
}: FlowHandlerDeps) => {

	const onNodesChange = useCallback(
		(allChanges: NodeChange<FlowNode>[]) => {
			// Outside free boards, positions come from the layout: a drag only picks a drop target.
			const changes =
				metaRef.current.layoutMode === "free"
					? allChanges
					: allChanges.filter((change) => change.type !== "position");
			if (changes.length === 0) return;
			let persisted = false;
			let structural = false;
			for (const change of changes) {
				if (change.type === "position") {
					persisted = true;
					if (change.dragging && !gestureRef.current) gestureRef.current = snapshot();
				} else if (change.type === "dimensions") {
					// Plain measurements (no `resizing` flag) are not edits.
					if (change.resizing !== undefined) persisted = true;
					if (change.resizing === true && !gestureRef.current) {
						gestureRef.current = snapshot();
					}
				} else if (change.type === "remove" || change.type === "add" || change.type === "replace") {
					persisted = true;
					structural = true;
				}
			}

			if (structural) beginBatch();
			setNodes(applyNodeChanges(changes, nodesRef.current));

			if (changes.some((c) => c.type === "dimensions" && c.resizing === false)) {
				commitGesture();
			}
			if (persisted && !structural) onDirtyRef.current("content");
		},
		[beginBatch, commitGesture, setNodes, snapshot, gestureRef, metaRef, nodesRef, onDirtyRef],
	);

	const onEdgesChange = useCallback(
		(changes: EdgeChange<FlowEdge>[]) => {
			const structural = changes.some(
				(c) => c.type === "remove" || c.type === "add" || c.type === "replace",
			);
			if (structural) beginBatch();
			setEdges(applyEdgeChanges(changes, edgesRef.current));
		},
		[beginBatch, setEdges, edgesRef],
	);

	const onNodeDragStop = useCallback(() => {
		commitGesture();
	}, [commitGesture]);

	const onConnect = useCallback(
		(connection: Connection) => {
			const { source, target } = connection;
			if (!source || !target || source === target) return;
			mutate((_nodes, current) => {
				const exists = current.some((edge) => edge.source === source && edge.target === target);
				if (exists) return {};
				if (metaRef.current.layoutMode === "tree") {
					const result = reparent(current, target, source, makeEdge);
					if (!result.ok) {
						onNoticeRef.current?.(result.reason);
						return {};
					}
					return { edges: result.edges };
				}
				return { edges: [...current, makeEdge(source, target)] };
			});
		},
		[mutate, metaRef, onNoticeRef],
	);

	const onMoveEnd = useCallback((_event: unknown, viewport: Viewport) => {
		if (sameViewport(viewport, viewportRef.current)) return;
		viewportRef.current = { x: viewport.x, y: viewport.y, zoom: viewport.zoom };
		onDirtyRef.current("viewport");
	}, [onDirtyRef, viewportRef]);

	return { onNodesChange, onEdgesChange, onNodeDragStop, onConnect, onMoveEnd };
};
