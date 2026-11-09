import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { GridHeaderNode } from "@src/features/nodes/components/nodes/gridHeader";
import { useBoardActions } from "@src/features/nodes/components/BoardActionsContext";
import EditableText from "@src/features/nodes/components/nodes/EditableText";

/** A row or column name. Double-click to rename it. */
const GridHeaderCell: React.FC<NodeProps<GridHeaderNode>> = ({ data }) => {
	const { setGridLabel } = useBoardActions();
	const fallback =
		data.axis === "corner"
			? "Rows \u00d7 Columns"
			: `${data.axis === "row" ? "Row" : "Column"} ${data.index + 1}`;

	return (
		<div className="flex h-full w-full items-center justify-center overflow-hidden rounded-md border border-slate-400/60 bg-slate-200 px-2 text-slate-900 dark:border-slate-500/60 dark:bg-slate-700 dark:text-slate-100">
			<EditableText
				singleLine
				value={data.label}
				placeholder={fallback}
				onCommit={(label) => setGridLabel(data.axis, data.index, label)}
				className="w-full text-center text-sm font-semibold"
			/>
		</div>
	);
};

export default memo(GridHeaderCell, (a, b) => a.id === b.id && a.data === b.data && a.width === b.width && a.height === b.height);
