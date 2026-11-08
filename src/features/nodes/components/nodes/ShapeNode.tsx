import { memo } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { DIAMOND, PALETTE } from "@src/features/nodes/lib/palette";
import type { FlowNode } from "@src/features/nodes/lib/serialize";
import { useBoardActions } from "@src/features/nodes/components/BoardActionsContext";
import EditableText from "@src/features/nodes/components/nodes/EditableText";
import { NodeHandles } from "@src/features/nodes/components/nodes/nodeShared";
import { sameNode } from "@src/features/nodes/components/nodes/sameNode";

const SHAPE_CLASS = {
	rect: "rounded-none",
	rounded: "rounded-2xl",
	ellipse: "rounded-[50%]",
} as const;

const ShapeNode: React.FC<NodeProps<FlowNode>> = ({ id, data, selected }) => {
	const { updateNodeData } = useBoardActions();
	const shape = data.shape ?? "rounded";

	const label = (
		<EditableText
			value={data.text ?? ""}
			placeholder="Label"
			onCommit={(text) => updateNodeData(id, { text })}
			className="text-center text-sm font-medium"
		/>
	);

	if (shape === "diamond") {
		return (
			<div
				data-selected={selected}
				className={`group relative flex h-full w-full items-center justify-center ${DIAMOND[data.color]}`}
			>
				<NodeResizer isVisible={selected} minWidth={60} minHeight={40} />
				<svg
					className="absolute inset-0 h-full w-full"
					viewBox="0 0 100 100"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<polygon
						points="50,1 99,50 50,99 1,50"
						strokeWidth={selected ? 3 : 2}
						vectorEffect="non-scaling-stroke"
					/>
				</svg>
				<div className="relative max-h-full w-1/2 overflow-hidden">{label}</div>
				<NodeHandles />
			</div>
		);
	}

	return (
		<div
			data-selected={selected}
			className={`group flex h-full w-full items-center justify-center border-2 shadow-sm ${
				SHAPE_CLASS[shape]
			} ${PALETTE[data.color].node} ${selected ? "ring-2 ring-cyan-400" : ""}`}
		>
			<NodeResizer isVisible={selected} minWidth={60} minHeight={40} />
			<div className={`max-h-full overflow-hidden ${shape === "ellipse" ? "w-3/4" : "w-[90%]"}`}>
				{label}
			</div>
			<NodeHandles />
		</div>
	);
};

export default memo(ShapeNode, sameNode);
