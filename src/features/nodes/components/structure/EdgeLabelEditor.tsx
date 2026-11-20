import { ArrowRight } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import type { FlowEdge } from "@src/features/nodes/lib/serialize";
import { BTN, TOGGLED } from "@src/features/nodes/components/structure/structureShared";
import type { StructureActions } from "@src/features/nodes/components/structure/types";

interface EdgeLabelEditorProps {
	edge: FlowEdge;
	actions: Pick<StructureActions, "updateEdge">;
}

/** Label and arrow controls for the one selected link. */
export const EdgeLabelEditor: React.FC<EdgeLabelEditorProps> = ({ edge, actions }) => (

	<div className="flex flex-wrap items-center gap-1">
		<input
			// Remount when the label changes elsewhere (undo/redo).
			key={`${edge.id}:${
				typeof edge.label === "string"
					? edge.label
					: ""
			}`}
			aria-label="Edge label"
			placeholder="Edge label"
			defaultValue={
				typeof edge.label === "string"
					? edge.label
					: ""
			}
			maxLength={80}
			onBlur={(event) => {
				const next = event.target.value.trim();
				const current =
					typeof edge.label === "string"
						? edge.label
						: "";
				if (next !== current)
					actions.updateEdge(edge.id, {
						label: next,
					});
			}}
			onKeyDown={(event) => {
				if (event.key === "Enter")
					event.currentTarget.blur();
			}}
			className="min-h-9 w-32 rounded-md bg-black/5 px-2 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-cyan-400 dark:bg-white/10 dark:text-gray-100 md:min-h-8"
		/>
		<Button
			className={`${BTN} ${edge.markerEnd ? TOGGLED : ""}`}
			aria-pressed={Boolean(edge.markerEnd)}
			onClick={() =>
				actions.updateEdge(edge.id, {
					arrow: !edge.markerEnd,
				})
			}
			title="Toggle arrow"
		>
			<ArrowRight className="h-4 w-4" />
			Arrow
		</Button>
	</div>
);
