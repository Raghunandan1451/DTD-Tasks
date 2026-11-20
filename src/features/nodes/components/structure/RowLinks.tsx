import { ChevronRight, X } from "lucide-react";
import type { FlowNode } from "@src/features/nodes/lib/serialize";
import { SELECT, textOf } from "@src/features/nodes/components/structure/structureShared";
import type { StructureActions } from "@src/features/nodes/components/structure/types";

interface RowLinksProps {
	nodeId: string;
	showLinks: boolean;
	canPickLink: boolean;
	/** Nodes this node could link to. */
	linkable: FlowNode[];
	/** Nodes this node already links to. */
	linkedTo: FlowNode[];
	actions: StructureActions;
}

/** The "Link to" picker and the chips of current links, on a node's button row. */
export const RowLinks: React.FC<RowLinksProps> = ({
	nodeId,
	showLinks,
	canPickLink,
	linkable,
	linkedTo,
	actions,
}) => (
	<>
		{canPickLink && (
			<div className="ml-auto flex flex-wrap items-center justify-end gap-1">
				<select
					aria-label="Link to"
					value=""
					onChange={(event) => {
						if (event.target.value) actions.link(nodeId, event.target.value);
					}}
					className={`${SELECT} max-w-40`}
				>
					<option value="" className="text-black">
						Link to…
					</option>
					{linkable.map((target) => (
						<option key={target.id} value={target.id} className="text-black">
							{textOf(target) || "Untitled"}
						</option>
					))}
				</select>
			</div>
		)}
		{showLinks && linkedTo.length > 0 && (
			<div className="flex flex-wrap items-center gap-1">
				{linkedTo.map((target) => (
					<span
						key={target.id}
						className="inline-flex items-center gap-0.5 rounded-full bg-black/10 py-0.5 pl-2 pr-0.5 text-xs text-gray-800 dark:bg-white/15 dark:text-gray-100"
					>
						<ChevronRight className="h-3 w-3" />
						{textOf(target) || "Untitled"}
						<button
							type="button"
							aria-label={`Remove link to ${textOf(target) || "Untitled"}`}
							className="rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/20"
							onClick={() => actions.unlink(nodeId, target.id)}
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				))}
			</div>
		)}
	</>
);
