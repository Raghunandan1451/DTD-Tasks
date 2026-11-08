import { useCallback, useRef, useState } from "react";
import type React from "react";
import {
	MarkerType,
	applyEdgeChanges,
	applyNodeChanges,
	useReactFlow,
	useStoreApi,
	type Connection,
	type EdgeChange,
	type NodeChange,
	type Viewport,
	type XYPosition,
} from "@xyflow/react";
import { newId } from "@src/lib/db/newId";
import type { BoardContent } from "@src/lib/db/boardsRepo";
import type {
	Board,
	BoardColor,
	BoardLayoutMode,
	BoardNode,
	BoardNodeType,
	BoardShape,
} from "@src/lib/db/types";
import type { OutlineGraph } from "@src/features/nodes/lib/outline";
import {
	DEFAULT_NODE_SIZE,
	EDGE_TYPE_LABELED,
	GRID_SIZE,
	PASTE_OFFSET,
} from "@src/features/nodes/lib/constants";
import {
	copySelection,
	pasteClipboard,
	type ClipboardData,
} from "@src/features/nodes/lib/clipboard";
import {
	canRedo,
	canUndo,
	commitChange,
	createHistory,
	redo as redoHistory,
	snapshotsEqual,
	undo as undoHistory,
	type History,
	type Snapshot,
} from "@src/features/nodes/lib/history";
import { DEFAULT_BOARD_COLOR } from "@src/features/nodes/lib/palette";
import { makeShapeNode } from "@src/features/nodes/lib/newBoard";
import {
	addColumn as gridAddColumn,
	addRow as gridAddRow,
	defaultColumns,
	removeColumn as gridRemoveColumn,
	removeRow as gridRemoveRow,
	type GridResult,
} from "@src/features/nodes/lib/gridOps";
import {
	childrenOf,
	descendantsOf,
	indent,
	moveInList,
	moveSibling,
	moveToTarget,
	outdent,
	parentMap,
	reparent,
	treeRows,
} from "@src/features/nodes/lib/structure";
import {
	fromBoardEdges,
	fromBoardNode,
	fromBoardNodes,
	toBoardEdges,
	toBoardNodes,
	type FlowEdge,
	type FlowNode,
	type FlowNodeData,
} from "@src/features/nodes/lib/serialize";
import type { DirtyKind } from "@src/features/nodes/lib/useAutosave";

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

export interface EdgePatch {
	label?: string;
	arrow?: boolean;
}

export interface LayoutMeta {
	layoutMode: BoardLayoutMode;
	/** Outline editor text, kept even while it has errors. */
	outline: string;
	treeRootId: string | null;
	/** Grid boards: how many columns the node list is cut into. */
	gridColumns: number;
}

/** Shared across boards, so a selection can be copied from one and pasted into another. */
let clipboard: ClipboardData | null = null;

const makeEdge = (source: string, target: string): FlowEdge => ({
	id: newId(),
	source,
	target,
	type: EDGE_TYPE_LABELED,
	markerEnd: { type: MarkerType.ArrowClosed },
});

const snap = (value: number): number => Math.round(value / GRID_SIZE) * GRID_SIZE;

const sameViewport = (a: Viewport, b: Viewport): boolean =>
	a.x === b.x && a.y === b.y && a.zoom === b.zoom;

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
	const pasteCountRef = useRef(0);

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
				? { gridColumns: metaRef.current.gridColumns }
				: {}),
		}),
		[],
	);

	const setHistory = useCallback((next: History) => {
		historyRef.current = next;
		setAvailability({ canUndo: canUndo(next), canRedo: canRedo(next) });
	}, []);

	/** Records `before` as one undo step if the board really changed, and marks it for saving. */
	const commit = useCallback(
		(before: Snapshot) => {
			const after = snapshot();
			if (snapshotsEqual(before, after)) return;
			setHistory(commitChange(historyRef.current, before, after));
			onDirtyRef.current("content");
		},
		[setHistory, snapshot],
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

	// --- React Flow change handlers ----------------------------------------

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
		[beginBatch, commitGesture, setNodes, snapshot],
	);

	const onEdgesChange = useCallback(
		(changes: EdgeChange<FlowEdge>[]) => {
			const structural = changes.some(
				(c) => c.type === "remove" || c.type === "add" || c.type === "replace",
			);
			if (structural) beginBatch();
			setEdges(applyEdgeChanges(changes, edgesRef.current));
		},
		[beginBatch, setEdges],
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
		[mutate],
	);

	const onMoveEnd = useCallback((_event: unknown, viewport: Viewport) => {
		if (sameViewport(viewport, viewportRef.current)) return;
		viewportRef.current = { x: viewport.x, y: viewport.y, zoom: viewport.zoom };
		onDirtyRef.current("viewport");
	}, []);

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

	// --- Structure actions (used by the right-hand panel and drag-and-drop) ---

	const refuse = useCallback((reason: string) => onNoticeRef.current?.(reason), []);

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
		[mutate],
	);

	/** Adds a node right after `id` under the same parent (or as a new top-level node). */
	const addSibling = useCallback(
		(id: string, type: BoardNodeType = "shape"): string => {
			const parent = parentMap(edgesRef.current).get(id);
			if (!parent) return addNode(type);
			const index = childrenOf(edgesRef.current, parent).indexOf(id) + 1;
			return addChild(parent, type, { index });
		},
		[addChild, addNode],
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
		[mutate, refuse],
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
		[mutate],
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
		[mutate, refuse],
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
		[removeNodes],
	);

	/** Applies a grid add/remove as one undo step; the column count is part of the step. */
	const changeGrid = useCallback(
		(operate: (items: BoardNode[], columns: number) => GridResult<BoardNode>) => {
			mutate((currentNodes, currentEdges) => {
				const result = operate(toBoardNodes(currentNodes), metaRef.current.gridColumns);
				const existing = new Map(currentNodes.map((node) => [node.id, node]));
				const gone = new Set(result.removed.map((node) => node.id));
				const next = { ...metaRef.current, gridColumns: result.columns };
				metaRef.current = next;
				setMetaState(next);
				return {
					nodes: result.items.map((item) => existing.get(item.id) ?? fromBoardNode(item)),
					edges: currentEdges.filter((edge) => !gone.has(edge.source) && !gone.has(edge.target)),
				};
			});
		},
		[mutate],
	);

	const addGridRow = useCallback(
		() => changeGrid((items, columns) => gridAddRow(items, columns, makeShapeNode)),
		[changeGrid],
	);
	const addGridColumn = useCallback(
		() => changeGrid((items, columns) => gridAddColumn(items, columns, makeShapeNode)),
		[changeGrid],
	);
	const removeGridRow = useCallback(
		(row: number) =>
			changeGrid((items, columns) => gridRemoveRow(items, columns, row, makeShapeNode)),
		[changeGrid],
	);
	const removeGridColumn = useCallback(
		(column: number) =>
			changeGrid((items, columns) => gridRemoveColumn(items, columns, column, makeShapeNode)),
		[changeGrid],
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
	}, [selectedNodeIds]);

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
	}, [insertCopies, selectedNodeIds]);

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
			if (target.gridColumns !== undefined && target.gridColumns !== metaRef.current.gridColumns) {
				const next = { ...metaRef.current, gridColumns: target.gridColumns };
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
		addGridRow,
		addGridColumn,
		removeGridRow,
		removeGridColumn,
		gridColumns: meta.gridColumns,
		/** Current graph in storable form, for the outline editor. */
		getGraph: snapshot,
	};
};
