import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Background,
	ConnectionMode,
	Controls,
	MiniMap,
	ReactFlow,
	SelectionMode,
	useReactFlow,
	type NodeTypes,
	type EdgeTypes,
	type XYPosition,
} from "@xyflow/react";
import { useTheme } from "@src/lib/hooks/useTheme";
import { useResizablePanel } from "@src/lib/hooks/useResizablePanel";
import ResizeHandle from "@src/components/ui/ResizeHandle";
import type { Board } from "@src/lib/db/types";
import { DEFAULT_NODE_SIZE, GRID_SIZE } from "@src/features/nodes/lib/constants";
import { computeLayout, type LayoutEdge, type LayoutNode } from "@src/features/nodes/lib/layout";
import type { FlowEdge, FlowNode } from "@src/features/nodes/lib/serialize";
import { buildSeed } from "@src/features/nodes/lib/seed";
import { useAutosave, type DirtyKind } from "@src/features/nodes/lib/useAutosave";
import { useBoardEditor } from "@src/features/nodes/lib/useBoardEditor";
import { useBoardShortcuts } from "@src/features/nodes/lib/useBoardShortcuts";
import { BoardActionsContext } from "@src/features/nodes/components/BoardActionsContext";
import CanvasToolbar, { type CanvasTool } from "@src/features/nodes/components/CanvasToolbar";
import StructurePanel from "@src/features/nodes/components/StructurePanel";
import LabeledEdge from "@src/features/nodes/components/edges/LabeledEdge";
import NoteNode from "@src/features/nodes/components/nodes/NoteNode";
import ShapeNode from "@src/features/nodes/components/nodes/ShapeNode";
import TextNode from "@src/features/nodes/components/nodes/TextNode";
import GridHeaderCell from "@src/features/nodes/components/nodes/GridHeaderNode";
import {
	GRID_HEADER_TYPE,
	toGridHeaderNode,
	type GridHeaderNode,
} from "@src/features/nodes/components/nodes/gridHeader";

// Defined once at module level: React Flow re-mounts every node if these change identity.
const nodeTypes: NodeTypes = {
	note: NoteNode,
	shape: ShapeNode,
	text: TextNode,
	[GRID_HEADER_TYPE]: GridHeaderCell,
};
const edgeTypes: EdgeTypes = { labeled: LabeledEdge };

const SNAP_GRID: [number, number] = [GRID_SIZE, GRID_SIZE];
const DELETE_KEYS = ["Backspace", "Delete"];
const PAN_WITH_RIGHT_OR_MIDDLE = [1, 2];

const CROSS_LINK_STYLE = { strokeDasharray: "6 4" };
const DROP_TARGET_CLASS = "rounded-lg ring-4 ring-cyan-400";

/** The structure panel starts open on desktop and closed on small screens. */
const isDesktop = (): boolean =>
	typeof window === "undefined" || typeof window.matchMedia !== "function"
		? true
		: window.matchMedia("(min-width: 768px)").matches;

/**
 * Layout input that keeps its identity until ids, sizes or links really change,
 * so selecting or panning never re-runs a layout.
 */
const useLayoutInput = (
	enabled: boolean,
	/**
	 * Grid cells are stretched to their column and row, so the size React Flow
	 * measures is the stretched one. Using it would make columns grow and never
	 * shrink back; the grid reads the nodes' own sizes instead.
	 */
	ignoreMeasured: boolean,
	nodes: FlowNode[],
	edges: FlowEdge[],
): { nodes: LayoutNode[]; edges: LayoutEdge[] } => {
	const cache = useRef<{
		key: string;
		value: { nodes: LayoutNode[]; edges: LayoutEdge[] };
	}>({
		key: "",
		value: { nodes: [], edges: [] },
	});
	if (!enabled) return cache.current.value;
	const layoutNodes = nodes.map((node) => {
		const fallback = DEFAULT_NODE_SIZE[node.type ?? "note"];
		return {
			id: node.id,
			width: node.width ?? (ignoreMeasured ? undefined : node.measured?.width) ?? fallback.width,
			height: node.height ?? (ignoreMeasured ? undefined : node.measured?.height) ?? fallback.height,
		};
	});
	const layoutEdges = edges.map((edge) => ({
		id: edge.id,
		source: edge.source,
		target: edge.target,
	}));
	const key = JSON.stringify([layoutNodes, layoutEdges]);
	if (key !== cache.current.key)
		cache.current = { key, value: { nodes: layoutNodes, edges: layoutEdges } };
	return cache.current.value;
};

interface BoardCanvasProps {
	/** The board as loaded. Render this inside a ReactFlowProvider, keyed by board id. */
	board: Board;
	onSaved: (board: Board) => void;
	onError: (message: string) => void;
	/** Lets the page flush this canvas before it reads or exports boards. */
	registerFlush: (flush: (() => Promise<void>) | null) => void;
	/** Lets the page ask which nodes are selected when it exports a picture. */
	registerSelection?: (read: (() => Set<string>) | null) => void;
}

const BoardCanvas: React.FC<BoardCanvasProps> = ({
	board,
	onSaved,
	onError,
	registerFlush,
	registerSelection,
}) => {
	const { theme } = useTheme();
	const [snapToGrid, setSnapToGrid] = useState(true);
	const [showMinimap, setShowMinimap] = useState(false);
	const [panelOpen, setPanelOpen] = useState(isDesktop);
	const [tool, setTool] = useState<CanvasTool>("pan");
	const { fitView, getIntersectingNodes } = useReactFlow();
	const panel = useResizablePanel({
		anchor: "right",
		defaultWidth: 340,
		minWidth: 260,
		maxRatio: 0.6,
	});

	// The editor reports changes to autosave, and autosave reads the editor: tie the loop with a ref.
	const markDirtyRef = useRef<(kind: DirtyKind) => void>(() => {});
	const editor = useBoardEditor({
		board,
		onDirty: (kind) => markDirtyRef.current(kind),
		onNotice: onError,
	});
	const autosave = useAutosave({
		boardId: board.id,
		getContent: editor.getContent,
		onSaved,
		onError,
	});

	useEffect(() => {
		markDirtyRef.current = autosave.markDirty;
	}, [autosave.markDirty]);

	useEffect(() => {
		registerFlush(autosave.flush);
		return () => registerFlush(null);
	}, [autosave.flush, registerFlush]);

	// Read through a ref so the page can ask at any time without re-registering on every selection.
	const nodesRef = useRef(editor.nodes);
	useEffect(() => {
		nodesRef.current = editor.nodes;
	}, [editor.nodes]);
	useEffect(() => {
		registerSelection?.(
			() => new Set(nodesRef.current.filter((node) => node.selected).map((node) => node.id)),
		);
		return () => registerSelection?.(null);
	}, [registerSelection]);

	useBoardShortcuts({
		undo: editor.undo,
		redo: editor.redo,
		copy: editor.copy,
		paste: editor.paste,
		duplicate: editor.duplicate,
	});

	const nodeActions = useMemo(
		() => ({ updateNodeData: editor.updateNodeData, setGridLabel: editor.setGridLabel }),
		[editor.updateNodeData, editor.setGridLabel],
	);

	const { layoutMode, treeRootId, gridColumns, gridRowLabels, gridColumnLabels, gridCornerLabel } =
		editor;
	const layoutInput = useLayoutInput(
		layoutMode !== "free",
		layoutMode === "grid",
		editor.nodes,
		editor.edges,
	);
	const layout = useMemo(
		() =>
			layoutMode === "free"
				? null
				: computeLayout(layoutMode, layoutInput.nodes, layoutInput.edges, treeRootId, gridColumns, {
						rows: gridRowLabels,
						columns: gridColumnLabels,
						corner: gridCornerLabel,
					}),
		[
			layoutMode,
			layoutInput,
			treeRootId,
			gridColumns,
			gridRowLabels,
			gridColumnLabels,
			gridCornerLabel,
		],
	);

	// While a node is dragged on a laid-out board it follows the pointer here,
	// and the node under it is highlighted as the drop target.
	const [dragging, setDragging] = useState<{
		id: string;
		position: XYPosition;
	} | null>(null);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);

	// Non-free modes only change what is shown: the saved positions stay untouched.
	const shownNodes = useMemo((): (FlowNode | GridHeaderNode)[] => {
		if (!layout) return editor.nodes;
		const cells = editor.nodes.map((node) => {
			const at = dragging?.id === node.id ? dragging.position : layout.positions[node.id];
			const size = layout.sizes?.[node.id];
			const base = {
				...node,
				...(at ? { position: at } : {}),
				...(size ? { width: size.width, height: size.height } : {}),
			};
			return node.id === dropTargetId ? { ...base, className: DROP_TARGET_CLASS } : base;
		});
		// Grid boards also show the row and column names; they exist only on screen.
		const headers = (layout.headers ?? []).map(toGridHeaderNode);
		return [...headers, ...cells];
	}, [editor.nodes, layout, dragging, dropTargetId]);
	const shownEdges = useMemo(() => {
		if (!layout || layout.crossLinks.size === 0) return editor.edges;
		return editor.edges.map((edge) =>
			layout.crossLinks.has(edge.id) ? { ...edge, style: CROSS_LINK_STYLE } : edge,
		);
	}, [editor.edges, layout]);

	const onNodeDrag = useCallback(
		(_event: unknown, node: FlowNode) => {
			if (layoutMode === "free") return;
			setDragging({ id: node.id, position: node.position });
			const hit = getIntersectingNodes(node).find(
				(other) => other.id !== node.id && other.type !== GRID_HEADER_TYPE,
			);
			setDropTargetId(hit?.id ?? null);
		},
		[getIntersectingNodes, layoutMode],
	);

	const { onNodeDragStop: finishDrag, applyDrop } = editor;
	const onNodeDragStop = useCallback(
		(_event: unknown, node: FlowNode) => {
			finishDrag();
			if (layoutMode === "free") return;
			if (dropTargetId) applyDrop(node.id, dropTargetId);
			setDragging(null);
			setDropTargetId(null);
		},
		[applyDrop, dropTargetId, finishDrag, layoutMode],
	);

	// Re-centre when the arrangement changes, not on every edit.
	const firstFit = useRef(true);
	useEffect(() => {
		if (firstFit.current) {
			firstFit.current = false;
			return;
		}
		const frame = requestAnimationFrame(() => {
			if (layoutMode !== "free") void fitView({ duration: 200, padding: 0.2 });
		});
		return () => cancelAnimationFrame(frame);
	}, [layoutMode, treeRootId, gridColumns, fitView]);

	const hasSelection = useMemo(
		() => editor.nodes.some((node) => node.selected) || editor.edges.some((edge) => edge.selected),
		[editor.nodes, editor.edges],
	);

	const actions = useMemo(
		() => ({
			addNode: editor.addNode,
			addChild: editor.addChild,
			addSibling: editor.addSibling,
			updateNodeData: editor.updateNodeData,
			setSelectedColor: editor.setSelectedColor,
			setSelectedShape: editor.setSelectedShape,
			updateEdge: editor.updateEdge,
			indentNode: editor.indentNode,
			outdentNode: editor.outdentNode,
			moveNode: editor.moveNode,
			link: editor.link,
			unlink: editor.unlink,
			removeNodes: editor.removeNodes,
			removeSubtree: editor.removeSubtree,
			selectOnly: editor.selectOnly,
			applyOutlineGraph: editor.applyOutlineGraph,
			addGridRow: editor.addGridRow,
			addGridColumn: editor.addGridColumn,
			removeGridRow: editor.removeGridRow,
			removeGridColumn: editor.removeGridColumn,
		}),
		[
			editor.addNode,
			editor.addChild,
			editor.addSibling,
			editor.updateNodeData,
			editor.setSelectedColor,
			editor.setSelectedShape,
			editor.updateEdge,
			editor.indentNode,
			editor.outdentNode,
			editor.moveNode,
			editor.link,
			editor.unlink,
			editor.removeNodes,
			editor.removeSubtree,
			editor.selectOnly,
			editor.applyOutlineGraph,
			editor.addGridRow,
			editor.addGridColumn,
			editor.removeGridRow,
			editor.removeGridColumn,
		],
	);

	const { updateMeta } = editor;
	const onOutlineChange = useCallback((outline: string) => updateMeta({ outline }), [updateMeta]);
	const onTreeRoot = useCallback(
		(id: string | null) => updateMeta({ treeRootId: id }),
		[updateMeta],
	);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<CanvasToolbar
				status={autosave.status}
				canUndo={editor.canUndo}
				canRedo={editor.canRedo}
				onUndo={editor.undo}
				onRedo={editor.redo}
				hasSelection={hasSelection}
				onDelete={editor.deleteSelected}
				snapToGrid={snapToGrid}
				onToggleSnap={() => setSnapToGrid((value) => !value)}
				showMinimap={showMinimap}
				onToggleMinimap={() => setShowMinimap((value) => !value)}
				layoutMode={layoutMode}
				tool={tool}
				onTool={setTool}
				panelOpen={panelOpen}
				onTogglePanel={() => setPanelOpen((open) => !open)}
				onSeed={import.meta.env.DEV ? () => editor.replaceContent(buildSeed()) : undefined}
			/>
			<div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
				<div className="min-h-0 min-w-0 flex-1">
					<BoardActionsContext.Provider value={nodeActions}>
						<ReactFlow
							// Header cells are display-only nodes; the editor never sees them as FlowNodes.
							nodes={shownNodes as FlowNode[]}
							edges={shownEdges}
							nodeTypes={nodeTypes}
							edgeTypes={edgeTypes}
							onNodesChange={editor.onNodesChange}
							onEdgesChange={editor.onEdgesChange}
							onConnect={editor.onConnect}
							onNodeDrag={onNodeDrag}
							onNodeDragStop={onNodeDragStop}
							onMoveEnd={editor.onMoveEnd}
							onDoubleClick={editor.onPaneDoubleClick}
							defaultViewport={board.viewport}
							minZoom={0.1}
							maxZoom={2}
							snapToGrid={snapToGrid}
							snapGrid={SNAP_GRID}
							connectionMode={ConnectionMode.Loose}
							deleteKeyCode={DELETE_KEYS}
							zoomOnDoubleClick={false}
							selectionOnDrag={tool === "select"}
							panOnDrag={tool === "select" ? PAN_WITH_RIGHT_OR_MIDDLE : true}
							selectionMode={SelectionMode.Partial}
							onlyRenderVisibleElements
							colorMode={theme}
						>
							<Background gap={GRID_SIZE} />
							<Controls showInteractive={false} />
							{showMinimap && <MiniMap pannable zoomable />}
						</ReactFlow>
					</BoardActionsContext.Provider>
				</div>
				{panelOpen && (
					<div
						ref={panel.containerRef}
						className="absolute inset-x-0 bottom-0 z-20 h-[55%] rounded-t-xl border-t border-white/20 bg-white/90 shadow-2xl backdrop-blur-md dark:bg-gray-900/90 md:static md:z-auto md:h-auto md:w-[var(--panel-width)] md:shrink-0 md:rounded-none md:border-l md:border-t-0 md:bg-white/10 md:shadow-none md:dark:bg-gray-900/20"
						style={{ "--panel-width": `${panel.width}px` } as React.CSSProperties}
					>
						<div className="hidden md:block">
							<ResizeHandle
								edge="left"
								label="Resize structure panel"
								onPointerDown={panel.startDragging}
							/>
						</div>
						<StructurePanel
							layoutMode={layoutMode}
							nodes={editor.nodes}
							edges={editor.edges}
							treeRootId={treeRootId}
							gridColumns={gridColumns}
							gridRowLabels={gridRowLabels}
							gridColumnLabels={gridColumnLabels}
							onTreeRoot={onTreeRoot}
							outline={editor.outline}
							onOutlineChange={onOutlineChange}
							actions={actions}
							onClose={() => setPanelOpen(false)}
						/>
					</div>
				)}
			</div>
		</div>
	);
};

export default BoardCanvas;
