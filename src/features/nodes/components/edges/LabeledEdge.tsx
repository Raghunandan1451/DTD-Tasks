import { memo } from "react";
import {
	BaseEdge,
	EdgeLabelRenderer,
	getStraightPath,
	useInternalNode,
	type EdgeProps,
	type InternalNode,
	type XYPosition,
} from "@xyflow/react";

interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

const rectOf = (node: InternalNode): Rect => ({
	x: node.internals.positionAbsolute.x,
	y: node.internals.positionAbsolute.y,
	width: node.measured.width ?? node.width ?? 0,
	height: node.measured.height ?? node.height ?? 0,
});

const centreOf = (rect: Rect): XYPosition => ({
	x: rect.x + rect.width / 2,
	y: rect.y + rect.height / 2,
});

/** Where the line from this box's centre toward `toward` leaves the box. */
const edgePoint = (rect: Rect, toward: XYPosition): XYPosition => {
	const centre = centreOf(rect);
	const dx = toward.x - centre.x;
	const dy = toward.y - centre.y;
	if ((dx === 0 && dy === 0) || rect.width === 0 || rect.height === 0) return centre;
	const scale = 1 / Math.max(Math.abs(dx) / (rect.width / 2), Math.abs(dy) / (rect.height / 2));
	return { x: centre.x + dx * scale, y: centre.y + dy * scale };
};

/**
 * A straight edge that leaves each node on the side facing the other, so edges
 * need no stored handle and stay tidy when nodes move. Shows its label at the
 * midpoint.
 */
const LabeledEdge: React.FC<EdgeProps> = ({
	id,
	source,
	target,
	label,
	markerEnd,
	selected,
	style: edgeStyle,
}) => {
	const sourceNode = useInternalNode(source);
	const targetNode = useInternalNode(target);
	if (!sourceNode || !targetNode) return null;

	const from = rectOf(sourceNode);
	const to = rectOf(targetNode);
	const start = edgePoint(from, centreOf(to));
	const end = edgePoint(to, centreOf(from));
	const [path, labelX, labelY] = getStraightPath({
		sourceX: start.x,
		sourceY: start.y,
		targetX: end.x,
		targetY: end.y,
	});

	return (
		<>
			<BaseEdge
				id={id}
				path={path}
				markerEnd={markerEnd}
				interactionWidth={24}
				style={{
					strokeWidth: selected ? 3 : 2,
					stroke: selected ? "#06b6d4" : undefined,
					// Cross-links in tree mode arrive as a dashed style.
					strokeDasharray: edgeStyle?.strokeDasharray,
				}}
			/>
			{typeof label === "string" && label !== "" && (
				<EdgeLabelRenderer>
					<div
						style={{
							transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
						}}
						className="nodrag nopan pointer-events-auto absolute max-w-48 truncate rounded bg-white/90 px-1.5 py-0.5 text-xs text-gray-800 shadow dark:bg-gray-800/90 dark:text-gray-100"
					>
						{label}
					</div>
				</EdgeLabelRenderer>
			)}
		</>
	);
};

export default memo(LabeledEdge);
