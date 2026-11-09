import { createContext, useContext } from "react";
import type { FlowNodeData } from "@src/features/nodes/lib/serialize";

/** What a node can ask the editor to do. Kept stable so memoized nodes don't re-render. */
export interface BoardNodeActions {
	updateNodeData: (id: string, patch: Partial<FlowNodeData>) => void;
	/** Names a grid board's row, column, or its corner cell (`index` is ignored for the corner). */
	setGridLabel: (axis: "row" | "column" | "corner", index: number, value: string) => void;
}

export const BoardActionsContext = createContext<BoardNodeActions>({
	updateNodeData: () => {},
	setGridLabel: () => {},
});

export const useBoardActions = (): BoardNodeActions => useContext(BoardActionsContext);
