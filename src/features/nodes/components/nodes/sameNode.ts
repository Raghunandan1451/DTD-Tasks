import type { NodeProps } from "@xyflow/react";
import type { FlowNode } from "@src/features/nodes/lib/serialize";

/**
 * Memo comparison for nodes. Position is left out on purpose: dragging changes it
 * on every frame, and a node's contents do not depend on it.
 */
export const sameNode = (a: NodeProps<FlowNode>, b: NodeProps<FlowNode>): boolean =>
	a.id === b.id &&
	a.data === b.data &&
	a.selected === b.selected &&
	a.width === b.width &&
	a.height === b.height;
