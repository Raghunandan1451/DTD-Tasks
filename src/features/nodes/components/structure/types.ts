import { type BoardColor, type BoardNodeType, type BoardShape } from "@src/lib/db/types";
import { type OutlineGraph } from "@src/features/nodes/lib/outline";
import type { FlowNodeData } from "@src/features/nodes/lib/serialize";
import type { EdgePatch } from "@src/features/nodes/lib/useBoardEditor";

/** The editor actions the panel calls. Mirrors what useBoardEditor returns. */
export interface StructureActions {
	addNode: (type: BoardNodeType, options?: { shape?: BoardShape }) => string;
	addChild: (
		parentId: string,
		type?: BoardNodeType,
		options?: { shape?: BoardShape },
	) => string;
	addSibling: (id: string, type?: BoardNodeType) => string;
	updateNodeData: (id: string, patch: Partial<FlowNodeData>) => void;
	setSelectedColor: (color: BoardColor) => void;
	setSelectedShape: (shape: BoardShape) => void;
	updateEdge: (id: string, patch: EdgePatch) => void;
	indentNode: (id: string) => void;
	outdentNode: (id: string) => void;
	moveNode: (id: string, direction: -1 | 1) => void;
	link: (source: string, target: string) => void;
	unlink: (source: string, target: string) => void;
	removeNodes: (ids: readonly string[]) => void;
	removeSubtree: (id: string) => void;
	selectOnly: (ids: readonly string[]) => void;
	applyOutlineGraph: (graph: OutlineGraph) => void;
	addGridRow: () => void;
	addGridColumn: () => void;
	removeGridRow: (row: number) => void;
	removeGridColumn: (column: number) => void;
}
