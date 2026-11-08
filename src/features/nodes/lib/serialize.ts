import { MarkerType, type Edge, type Node } from "@xyflow/react";
import {
	BOARD_SHAPES,
	BOARD_TEXT_MAX,
	type BoardColor,
	type BoardEdge,
	type BoardNode,
	type BoardNodeData,
	type BoardNodeType,
	type BoardShape,
} from "@src/lib/db/types";
import { EDGE_TYPE_LABELED } from "@src/features/nodes/lib/constants";
import { toBoardColor } from "@src/features/nodes/lib/palette";

/**
 * React Flow's `data` must be a plain object type, so this mirrors
 * BoardNodeData as a type alias rather than an interface.
 */
export type FlowNodeData = {
	title?: string;
	text?: string;
	color: BoardColor;
	shape?: BoardShape;
};

export type FlowNode = Node<FlowNodeData, BoardNodeType>;
export type FlowEdge = Edge;

const clampText = (value: string): string => value.slice(0, BOARD_TEXT_MAX);

const isShape = (value: unknown): value is BoardShape =>
	typeof value === "string" && (BOARD_SHAPES as readonly string[]).includes(value);

const isPositive = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value) && value > 0;

/**
 * Builds the stored data from known keys only, so nothing else that sits on a
 * node (selection, drag state, measurements) can ever be saved.
 */
const toBoardNodeData = (data: Partial<FlowNodeData>): BoardNodeData => {
	const out: BoardNodeData = { color: toBoardColor(data.color) };
	if (typeof data.title === "string") out.title = clampText(data.title);
	if (typeof data.text === "string") out.text = clampText(data.text);
	if (isShape(data.shape)) out.shape = data.shape;
	return out;
};

/** React Flow node -> storable record. A whitelist: unknown fields are dropped. */
export const toBoardNode = (node: FlowNode): BoardNode => {
	const out: BoardNode = {
		id: node.id,
		type: node.type ?? "note",
		position: { x: node.position.x, y: node.position.y },
		data: toBoardNodeData(node.data),
	};
	if (isPositive(node.width)) out.width = node.width;
	if (isPositive(node.height)) out.height = node.height;
	return out;
};

export const toBoardEdge = (edge: FlowEdge): BoardEdge => {
	const out: BoardEdge = {
		id: edge.id,
		source: edge.source,
		target: edge.target,
	};
	if (typeof edge.label === "string" && edge.label !== "") out.label = edge.label;
	if (edge.markerEnd) out.arrow = true;
	return out;
};

export const toBoardNodes = (nodes: readonly FlowNode[]): BoardNode[] => nodes.map(toBoardNode);

export const toBoardEdges = (edges: readonly FlowEdge[]): BoardEdge[] => edges.map(toBoardEdge);

/** Stored record -> React Flow node. Runtime state is rebuilt by React Flow. */
export const fromBoardNode = (node: BoardNode): FlowNode => ({
	id: node.id,
	type: node.type,
	position: { x: node.position.x, y: node.position.y },
	data: toBoardNodeData(node.data),
	...(node.width !== undefined ? { width: node.width } : {}),
	...(node.height !== undefined ? { height: node.height } : {}),
});

export const fromBoardEdge = (edge: BoardEdge): FlowEdge => ({
	id: edge.id,
	source: edge.source,
	target: edge.target,
	type: EDGE_TYPE_LABELED,
	...(edge.label ? { label: edge.label } : {}),
	...(edge.arrow ? { markerEnd: { type: MarkerType.ArrowClosed } } : {}),
});

export const fromBoardNodes = (nodes: readonly BoardNode[]): FlowNode[] => nodes.map(fromBoardNode);

export const fromBoardEdges = (edges: readonly BoardEdge[]): FlowEdge[] => edges.map(fromBoardEdge);
