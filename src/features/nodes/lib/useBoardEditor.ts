import React, { useCallback, useRef, useState } from "react";
import { MarkerType, useReactFlow, useStoreApi, type Viewport, type XYPosition } from "@xyflow/react";
import { newId } from "@src/lib/db/newId";
import { type BoardContent } from "@src/lib/storage";
import { type Board, type BoardColor, type BoardNodeType, type BoardShape } from "@src/lib/db/types";
import { type OutlineGraph } from "@src/features/nodes/lib/outline";
import { DEFAULT_NODE_SIZE } from "@src/features/nodes/lib/constants";
import { canRedo, canUndo, commitChange, createHistory, redo as redoHistory, snapshotsEqual, undo as undoHistory, type History, type Snapshot } from "@src/features/nodes/lib/history";
import { DEFAULT_BOARD_COLOR } from "@src/features/nodes/lib/palette";
import { defaultColumns } from "@src/features/nodes/lib/gridOps";
import { moveToTarget } from "@src/features/nodes/lib/structure";
import { fromBoardEdges, fromBoardNode, fromBoardNodes, toBoardEdges, toBoardNodes, type FlowEdge, type FlowNode, type FlowNodeData } from "@src/features/nodes/lib/serialize";
import { type DirtyKind } from "@src/features/nodes/lib/useAutosave";
import { useGridActions } from "@src/features/nodes/lib/useGridActions";
import { useStructureActions } from "@src/features/nodes/lib/useStructureActions";
import { snap, type EdgePatch, type LayoutMeta } from "@src/features/nodes/lib/boardEditorShared";
import { useFlowHandlers } from "@src/features/nodes/lib/useFlowHandlers";
import { useClipboardActions } from "@src/features/nodes/lib/useClipboardActions";

export type { EdgePatch, LayoutMeta };

interface UseBoardEditorOptions {
	/** The board as loaded. Only read once; the editor owns the content after that. */
	board: Board;
	onDirty: (kind: DirtyKind) => void;
	/** Told why a structure change was refused (for example a loop). */
	onNotice?: (message: string) => void;
}

interface AddNodeOptions {
	/** Flow coordinates of the node's top-left corner. Defaults to the view centre. */
	position?: XYPosition;
	shape?: BoardShape;
}


/**
 * All state and actions for the open board: nodes, edges, undo/redo, clipboard.
 * Must be called below a <ReactFlowProvider>. Every undoable change goes through
 * `commit`, so a drag (many position changes) or a delete that also removes
 * edges (two change events) ends up as one history step.
 */
export const useBoardEditor = ({ board, onDirty, onNotice }: UseBoardEditorOptions) => {
	const { screenToFlowPosition } = useReactFlow();
	const store = useStoreApi();

	const [nodes, setNodesState] = useState<FlowNode[]>(() => fromBoardNodes(board.nodes));
	const [edges, setEdgesState] = useState<FlowEdge[]>(() => fromBoardEdges(board.edges));
	// View settings: not undoable, saved with the board.
	const [meta, setMetaState] = useState<LayoutMeta>(() => ({
		layoutMode: board.layoutMode ?? "free",
		outline: board.outline ?? "",
		treeRootId: board.treeRootId ?? null,
		gridColumns: board.gridColumns ?? defaultColumns(board.nodes.length),
		gridRowLabels: board.gridRowLabels ?? [],
		gridColumnLabels: board.gridColumnLabels ?? [],
		gridCornerLabel: board.gridCornerLabel ?? "",
	}));
	const metaRef = useRef(meta);
	const [availability, setAvailability] = useState({
		canUndo: false,
		canRedo: false,
	});

	// Refs hold the latest values synchronously, so handlers never read stale state.
	const nodesRef = useRef(nodes);
	const edgesRef = useRef(edges);
	const viewportRef = useRef<Viewport>({ ...board.viewport });
	const historyRef = useRef<History>(createHistory());
	/** State from before an in-progress drag or resize. */
	const gestureRef = useRef<Snapshot | null>(null);
	/** State from before a delete; committed once the current event finishes. */
	const batchRef = useRef<Snapshot | null>(null);

	const onDirtyRef = useRef(onDirty);
	onDirtyRef.current = onDirty;
	const onNoticeRef = useRef(onNotice);
	onNoticeRef.current = onNotice;

	const setNodes = useCallback((next: FlowNode[]) => {
		nodesRef.current = next;
		setNodesState(next);
	}, []);
	const setEdges = useCallback((next: FlowEdge[]) => {
		edgesRef.current = next;
		setEdgesState(next);
	}, []);

	const snapshot = useCallback(
		(): Snapshot => ({
			nodes: toBoardNodes(nodesRef.current),
			edges: toBoardEdges(edgesRef.current),
			...(metaRef.current.layoutMode === "grid"
				? {
						gridColumns: metaRef.current.gridColumns,
						...(metaRef.current.gridRowLabels.length > 0
							? { gridRowLabels: metaRef.current.gridRowLabels }
							: {}),
						...(metaRef.current.gridColumnLabels.length > 0
							? { gridColumnLabels: metaRef.current.gridColumnLabels }
							: {}),
						...(metaRef.current.gridCornerLabel
							? { gridCornerLabel: metaRef.current.gridCornerLabel }
							: {}),
					}
				: {}),
		}),
		[],
	);

	const setHistory = useCallback((next: History) => {
		historyRef.current = next;
		setAvailability({ canUndo: canUndo(next), canRedo: canRedo(next) });
	}, []);

	/**
	 * Grid boards only: forgets columns (and their names) that have no cell left,
	 * and row names past the last row. Runs before every history step, so deleting
	 * cells never leaves empty columns behind, and undo brings them back.
	 */
	const trimGridMeta = useCallback(() => {
		const current = metaRef.current;
		if (current.layoutMode !== "grid") return;
		const count = nodesRef.current.length;
		const columns = Math.max(1, Math.min(current.gridColumns, count));
		const rows = Math.max(1, Math.ceil(count / columns));
		const rowLabels = current.gridRowLabels.slice(0, rows);
		const columnLabels = current.gridColumnLabels.slice(0, columns);
		if (
			columns === current.gridColumns &&
			rowLabels.length === current.gridRowLabels.length &&
			columnLabels.length === current.gridColumnLabels.length
		) {
			return;
		}
		const next = {
			...current,
			gridColumns: columns,
			gridRowLabels: rowLabels,
			gridColumnLabels: columnLabels,
		};
		metaRef.current = next;
		setMetaState(next);
	}, []);

	/** Records `before` as one undo step if the board really changed, and marks it for saving. */
	const commit = useCallback(
		(before: Snapshot) => {
			trimGridMeta();
			const after = snapshot();
			if (snapshotsEqual(before, after)) return;
			setHistory(commitChange(historyRef.current, before, after));
			onDirtyRef.current("content");
		},
		[setHistory, snapshot, trimGridMeta],
	);

	/** Applies a discrete change (add, delete, edit) as a single undo step. */
	const mutate = useCallback(
		(
			change: (nodes: FlowNode[], edges: FlowEdge[]) => { nodes?: FlowNode[]; edges?: FlowEdge[] },
		) => {
			const before = snapshot();
			const next = change(nodesRef.current, edgesRef.current);
			if (next.nodes) setNodes(next.nodes);
			if (next.edges) setEdges(next.edges);
			commit(before);
		},
		[commit, setEdges, setNodes, snapshot],
	);

	const commitGesture = useCallback(() => {
		const before = gestureRef.current;
		gestureRef.current = null;
		if (before) commit(before);
	}, [commit]);

	/** Starts a delete batch; its history step is recorded after the event settles. */
	const beginBatch = useCallback(() => {
		if (batchRef.current) return;
		batchRef.current = snapshot();
		queueMicrotask(() => {
			const before = batchRef.current;
			batchRef.current = null;
			if (before) commit(before);
		});
	}, [commit, snapshot]);

	// --- React Flow change handlers (own hook) ---
	const { onNodesChange, onEdgesChange, onNodeDragStop, onConnect, onMoveEnd } =
		useFlowHandlers({
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
		});


	// --- Actions ------------------------------------------------------------

	const selectedNodeIds = useCallback(
		(): Set<string> =>
			new Set(nodesRef.current.filter((node) => node.selected).map((node) => node.id)),
		[],
	);

	const viewCentre = useCallback((): XYPosition => {
		const { width, height, transform } = store.getState();
		const [tx, ty, zoom] = transform;
		return { x: (width / 2 - tx) / zoom, y: (height / 2 - ty) / zoom };
	}, [store]);

	const addNode = useCallback(
		(type: BoardNodeType, options: AddNodeOptions = {}): string => {
			const size = DEFAULT_NODE_SIZE[type];
			const centre = options.position ? null : viewCentre();
			const position = options.position ?? {
				x: (centre?.x ?? 0) - size.width / 2,
				y: (centre?.y ?? 0) - size.height / 2,
			};
			const node: FlowNode = {
				...fromBoardNode({
					id: newId(),
					type,
					position: { x: snap(position.x), y: snap(position.y) },
					width: size.width,
					height: size.height,
					data: {
						color: DEFAULT_BOARD_COLOR,
						...(type === "shape" ? { shape: options.shape ?? "rounded" } : {}),
					},
				}),
				selected: true,
			};
			mutate((current) => ({
				nodes: [...current.map((n) => (n.selected ? { ...n, selected: false } : n)), node],
			}));
			return node.id;
		},
		[mutate, viewCentre],
	);

	/** Double-click on empty canvas adds a note where the pointer is. */
	const onPaneDoubleClick = useCallback(
		(event: React.MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest(".react-flow__pane")) return;
			if (target.closest(".react-flow__node, .react-flow__edge")) return;
			const at = screenToFlowPosition({ x: event.clientX, y: event.clientY });
			addNode("note", {
				position: {
					x: at.x - DEFAULT_NODE_SIZE.note.width / 2,
					y: at.y - DEFAULT_NODE_SIZE.note.height / 2,
				},
			});
		},
		[addNode, screenToFlowPosition],
	);

	const updateNodeData = useCallback(
		(id: string, patch: Partial<FlowNodeData>) => {
			mutate((current) => ({
				nodes: current.map((node) =>
					node.id === id ? { ...node, data: { ...node.data, ...patch } } : node,
				),
			}));
		},
		[mutate],
	);

	/** Remembers where a node was dragged on a graph or tree board (one undo step). */
	const pinNode = useCallback(
		(id: string, mode: "graph" | "tree", position: { x: number; y: number }) => {
			mutate((current) => ({
				nodes: current.map((node) =>
					node.id === id
						? {
								...node,
								data: {
									...node.data,
									pins: {
										...node.data.pins,
										[mode]: { x: Math.round(position.x), y: Math.round(position.y) },
									},
								},
							}
						: node,
				),
			}));
		},
		[mutate],
	);

	/** Sets the colour of every selected node. */
	const setSelectedColor = useCallback(
		(color: BoardColor) => {
			mutate((current) => ({
				nodes: current.map((node) =>
					node.selected ? { ...node, data: { ...node.data, color } } : node,
				),
			}));
		},
		[mutate],
	);

	const updateEdge = useCallback(
		(id: string, patch: EdgePatch) => {
			mutate((_nodes, current) => ({
				edges: current.map((edge) => {
					if (edge.id !== id) return edge;
					const next: FlowEdge = { ...edge };
					if (patch.label !== undefined) {
						if (patch.label) next.label = patch.label;
						else delete next.label;
					}
					if (patch.arrow !== undefined) {
						if (patch.arrow) next.markerEnd = { type: MarkerType.ArrowClosed };
						else delete next.markerEnd;
					}
					return next;
				}),
			}));
		},
		[mutate],
	);

	/** Removes the selected nodes (and their edges) and selected edges in one step. */
	const deleteSelected = useCallback(() => {
		mutate((currentNodes, currentEdges) => {
			const gone = new Set(currentNodes.filter((node) => node.selected).map((node) => node.id));
			return {
				nodes: currentNodes.filter((node) => !gone.has(node.id)),
				edges: currentEdges.filter(
					(edge) => !edge.selected && !gone.has(edge.source) && !gone.has(edge.target),
				),
			};
		});
	}, [mutate]);

	// --- Structure and grid actions (their own hooks, same shared state) ---
	const {
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
	} = useStructureActions({ mutate, nodesRef, edgesRef, metaRef, onNoticeRef, addNode });
	const { addGridRow, addGridColumn, removeGridRow, removeGridColumn, setGridLabel } =
		useGridActions({ mutate, metaRef, setMetaState });
	/** Sets the shape of every selected shape node. */
	const setSelectedShape = useCallback(
		(shape: BoardShape) => {
			mutate((current) => ({
				nodes: current.map((node) =>
					node.selected && node.type === "shape"
						? { ...node, data: { ...node.data, shape } }
						: node,
				),
			}));
		},
		[mutate],
	);

	/** Selects exactly these nodes (not an undo step, nothing is saved). */
	const selectOnly = useCallback(
		(ids: readonly string[]) => {
			const wanted = new Set(ids);
			setNodes(
				nodesRef.current.map((node) => ({
					...node,
					selected: wanted.has(node.id),
				})),
			);
			setEdges(
				edgesRef.current.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)),
			);
		},
		[setEdges, setNodes],
	);

	/** What dropping a dragged node on another one does, for each board type. */
	const applyDrop = useCallback(
		(dragId: string, targetId: string) => {
			if (dragId === targetId) return;
			switch (metaRef.current.layoutMode) {
				case "tree":
					reparentNode(dragId, targetId);
					break;
				case "graph":
					link(dragId, targetId);
					break;
				case "grid":
					mutate((current) => ({
						nodes: moveToTarget(current, dragId, targetId),
					}));
					break;
				default:
					break;
			}
		},
		[link, mutate, reparentNode],
	);

	// --- Copy, paste, duplicate (own hook) ---
	const { copy, paste, duplicate } = useClipboardActions({
		mutate,
		nodesRef,
		edgesRef,
		selectedNodeIds,
	});


	/** Shows a stored snapshot, keeping selection and measurements of nodes that remain. */
	const applySnapshot = useCallback(
		(target: Snapshot) => {
			const previous = new Map(nodesRef.current.map((node) => [node.id, node]));
			setNodes(
				fromBoardNodes(target.nodes).map((node): FlowNode => {
					const old = previous.get(node.id);
					return old ? { ...node, measured: old.measured, selected: old.selected } : node;
				}),
			);
			setEdges(fromBoardEdges(target.edges));
			const gridColumns = target.gridColumns ?? metaRef.current.gridColumns;
			const gridRowLabels = target.gridRowLabels ?? [];
			const gridColumnLabels = target.gridColumnLabels ?? [];
			const gridCornerLabel = target.gridCornerLabel ?? "";
			if (
				gridCornerLabel !== metaRef.current.gridCornerLabel ||
				gridColumns !== metaRef.current.gridColumns ||
				JSON.stringify(gridRowLabels) !== JSON.stringify(metaRef.current.gridRowLabels) ||
				JSON.stringify(gridColumnLabels) !== JSON.stringify(metaRef.current.gridColumnLabels)
			) {
				const next = {
					...metaRef.current,
					gridColumns,
					gridRowLabels,
					gridColumnLabels,
					gridCornerLabel,
				};
				metaRef.current = next;
				setMetaState(next);
			}
		},
		[setEdges, setNodes],
	);

	const undo = useCallback(() => {
		gestureRef.current = null;
		const step = undoHistory(historyRef.current, snapshot());
		if (!step) return;
		setHistory(step.history);
		applySnapshot(step.snapshot);
		onDirtyRef.current("content");
	}, [applySnapshot, setHistory, snapshot]);

	const redo = useCallback(() => {
		gestureRef.current = null;
		const step = redoHistory(historyRef.current, snapshot());
		if (!step) return;
		setHistory(step.history);
		applySnapshot(step.snapshot);
		onDirtyRef.current("content");
	}, [applySnapshot, setHistory, snapshot]);

	/** The content to save. Built from the whitelist, so no runtime fields. */
	const getContent = useCallback(
		(): BoardContent => ({
			...snapshot(),
			viewport: { ...viewportRef.current },
			layoutMode: metaRef.current.layoutMode,
			...(metaRef.current.outline ? { outline: metaRef.current.outline } : {}),
			...(metaRef.current.treeRootId ? { treeRootId: metaRef.current.treeRootId } : {}),
		}),
		[snapshot],
	);

	const updateMeta = useCallback((patch: Partial<LayoutMeta>) => {
		const next = { ...metaRef.current, ...patch };
		metaRef.current = next;
		setMetaState(next);
		onDirtyRef.current("content");
	}, []);

	/**
	 * Replaces the graph with an outline's result as one undo step. Saved
	 * positions of nodes that stay are kept, so free mode is never disturbed.
	 */
	const applyOutlineGraph = useCallback(
		(graph: OutlineGraph) => {
			mutate((current) => {
				const previous = new Map(current.map((node) => [node.id, node]));
				return {
					nodes: fromBoardNodes(graph.nodes).map((node): FlowNode => {
						const old = previous.get(node.id);
						return old ? { ...node, measured: old.measured, selected: old.selected } : node;
					}),
					edges: fromBoardEdges(graph.edges),
				};
			});
			const rootId = metaRef.current.treeRootId;
			if (rootId && !graph.nodes.some((node) => node.id === rootId)) {
				updateMeta({ treeRootId: null });
			}
		},
		[mutate, updateMeta],
	);

	/** Replaces the whole canvas without an undo step (used by the dev seed). */
	const replaceContent = useCallback(
		(content: Snapshot) => {
			applySnapshot(content);
			setHistory(createHistory());
			onDirtyRef.current("content");
		},
		[applySnapshot, setHistory],
	);

	return {
		nodes,
		edges,
		canUndo: availability.canUndo,
		canRedo: availability.canRedo,
		onNodesChange,
		onEdgesChange,
		onNodeDragStop,
		onConnect,
		onMoveEnd,
		onPaneDoubleClick,
		addNode,
		updateNodeData,
		setSelectedColor,
		updateEdge,
		deleteSelected,
		copy,
		paste,
		duplicate,
		undo,
		redo,
		getContent,
		replaceContent,
		layoutMode: meta.layoutMode,
		outline: meta.outline,
		treeRootId: meta.treeRootId,
		updateMeta,
		applyOutlineGraph,
		setSelectedShape,
		selectOnly,
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
		applyDrop,
		pinNode,
		addGridRow,
		addGridColumn,
		removeGridRow,
		removeGridColumn,
		setGridLabel,
		gridColumns: meta.gridColumns,
		gridRowLabels: meta.gridRowLabels,
		gridColumnLabels: meta.gridColumnLabels,
		gridCornerLabel: meta.gridCornerLabel,
		/** Current graph in storable form, for the outline editor. */
		getGraph: snapshot,
	};
};
