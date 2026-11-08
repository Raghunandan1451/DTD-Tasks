import { memo } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { PALETTE } from "@src/features/nodes/lib/palette";
import type { FlowNode } from "@src/features/nodes/lib/serialize";
import { useBoardActions } from "@src/features/nodes/components/BoardActionsContext";
import EditableText from "@src/features/nodes/components/nodes/EditableText";
import { NodeHandles } from "@src/features/nodes/components/nodes/nodeShared";
import { sameNode } from "@src/features/nodes/components/nodes/sameNode";

const NoteNode: React.FC<NodeProps<FlowNode>> = ({ id, data, selected }) => {
	const { updateNodeData } = useBoardActions();

	return (
		<div
			data-selected={selected}
			className={`group flex h-full w-full flex-col gap-1 overflow-hidden rounded-lg border-2 p-2 shadow-sm ${
				PALETTE[data.color].node
			} ${selected ? "ring-2 ring-cyan-400" : ""}`}
		>
			<NodeResizer isVisible={selected} minWidth={120} minHeight={70} />
			<EditableText
				singleLine
				value={data.title ?? ""}
				placeholder="Title"
				onCommit={(title) => updateNodeData(id, { title })}
				className="text-sm font-semibold"
			/>
			<div className="min-h-0 flex-1 overflow-hidden">
				<EditableText
					value={data.text ?? ""}
					placeholder="Double-click to write"
					onCommit={(text) => updateNodeData(id, { text })}
					className="text-xs"
				/>
			</div>
			<NodeHandles />
		</div>
	);
};

export default memo(NoteNode, sameNode);
