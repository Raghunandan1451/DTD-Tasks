import { Handle, Position } from "@xyflow/react";

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left] as const;

/** Four connection points, shown on hover or selection. Edges attach to the nearest side on their own. */
export const NodeHandles: React.FC = () => (
	<>
		{SIDES.map((side) => (
			<Handle
				key={side}
				id={side}
				type="source"
				position={side}
				className="!h-2.5 !w-2.5 !border-white !bg-cyan-500 opacity-0 transition-opacity group-hover:opacity-100 group-data-[selected=true]:opacity-100"
			/>
		))}
	</>
);
