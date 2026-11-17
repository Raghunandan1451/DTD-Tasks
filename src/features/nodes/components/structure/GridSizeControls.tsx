import { Plus, X } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import { BTN } from "@src/features/nodes/components/structure/structureShared";
import type { StructureActions } from "@src/features/nodes/components/structure/types";

interface GridSizeControlsProps {
	gridRows: number;
	gridColumns: number;
	gridColumnLabels: readonly string[];
	actions: Pick<StructureActions, "addGridRow" | "addGridColumn" | "removeGridColumn">;
}

/** Row and column counts of a grid board, with buttons to add or remove them. */
export const GridSizeControls: React.FC<GridSizeControlsProps> = ({
	gridRows,
	gridColumns,
	gridColumnLabels,
	actions,
}) => (

	<div className="flex flex-col gap-1" aria-label="Grid size">
		<p className="text-xs text-gray-700 dark:text-gray-200">
			{gridRows} {gridRows === 1 ? "row" : "rows"} ×{" "}
			{gridColumns}{" "}
			{gridColumns === 1 ? "column" : "columns"}
		</p>
		<div className="flex flex-wrap items-center gap-1">
			<Button
				className={BTN}
				onClick={actions.addGridRow}
				title="Add a row of nodes"
			>
				<Plus className="h-4 w-4" />
				Row
			</Button>
			<Button
				className={BTN}
				onClick={actions.addGridColumn}
				title="Add a column of nodes"
			>
				<Plus className="h-4 w-4" />
				Column
			</Button>
		</div>
		<div className="flex flex-wrap items-center gap-1">
			{Array.from(
				{ length: gridColumns },
				(_unused, column) => (
					<Button
						key={column}
						className={BTN}
						disabled={gridColumns <= 1}
						onClick={() =>
							actions.removeGridColumn(column)
						}
						aria-label={`Remove column ${column + 1}`}
						title={`Remove column ${column + 1}`}
					>
						{gridColumnLabels[column] ||
							`C${column + 1}`}
						<X className="h-3 w-3" />
					</Button>
				),
			)}
		</div>
	</div>
);
