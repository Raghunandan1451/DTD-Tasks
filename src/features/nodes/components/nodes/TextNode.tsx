import { memo } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { TEXT_COLOR } from "@src/features/nodes/lib/palette";
import type { FlowNode } from "@src/features/nodes/lib/serialize";
import { useBoardActions } from "@src/features/nodes/components/BoardActionsContext";
import EditableText from "@src/features/nodes/components/nodes/EditableText";
import { NodeHandles } from "@src/features/nodes/components/nodes/nodeShared";
import { sameNode } from "@src/features/nodes/components/nodes/sameNode";

/** A free label: text only, no box. */
const TextNode: React.FC<NodeProps<FlowNode>> = ({ id, data, selected }) => {
	const { updateNodeData } = useBoardActions();

	return (
		<div
			data-selected={selected}
			className={`group h-full w-full rounded px-1 ${
				selected ? "outline outline-2 outline-dashed outline-cyan-400" : ""
			}`}
		>
			<NodeResizer isVisible={selected} minWidth={40} minHeight={24} />
			<EditableText
				value={data.text ?? ""}
				placeholder="Text"
				onCommit={(text) => updateNodeData(id, { text })}
				className={`text-base font-medium ${TEXT_COLOR[data.color]}`}
			/>
			<NodeHandles />
		</div>
	);
};

export default memo(TextNode, sameNode);
