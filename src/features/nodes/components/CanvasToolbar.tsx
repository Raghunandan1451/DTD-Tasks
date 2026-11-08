import {
	Hand,
	Map as MapIcon,
	Grid3x3,
	MousePointer2,
	PanelRight,
	Redo2,
	Trash2,
	Undo2,
} from "lucide-react";
import Button from "@src/components/ui/button/Button";
import type { BoardLayoutMode } from "@src/lib/db/types";
import type { SaveStatus } from "@src/features/nodes/lib/useAutosave";
import { BOARD_TYPE_LABEL } from "@src/features/nodes/lib/labels";
import SaveIndicator from "@src/features/nodes/components/SaveIndicator";
import ShortcutsPopover from "@src/features/nodes/components/ShortcutsPopover";

export type CanvasTool = "select" | "pan";

interface CanvasToolbarProps {
	status: SaveStatus;
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
	hasSelection: boolean;
	onDelete: () => void;
	snapToGrid: boolean;
	onToggleSnap: () => void;
	showMinimap: boolean;
	onToggleMinimap: () => void;
	/** The board's type. Chosen when the board is created, so it is only shown here. */
	layoutMode: BoardLayoutMode;
	tool: CanvasTool;
	onTool: (tool: CanvasTool) => void;
	panelOpen: boolean;
	onTogglePanel: () => void;
	/** Dev builds only. */
	onSeed?: () => void;
}

const TOOL =
	"inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-md px-2 text-xs md:min-h-8 md:min-w-0 md:text-sm text-gray-800 dark:text-gray-100 bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 disabled:opacity-40 disabled:pointer-events-none";
const TOGGLED = "ring-2 ring-cyan-400";

/** Label shown from md up; below that only the icon is shown. */
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<span className="hidden md:inline">{children}</span>
);

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
	status,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
	hasSelection,
	onDelete,
	snapToGrid,
	onToggleSnap,
	showMinimap,
	onToggleMinimap,
	layoutMode,
	tool,
	onTool,
	panelOpen,
	onTogglePanel,
	onSeed,
}) => (
	<div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/20 bg-white/10 px-2 py-1.5 backdrop-blur-md dark:bg-gray-900/20">
		<span
			className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-medium text-cyan-800 dark:text-cyan-200"
			title="Board type (set when the board was created)"
		>
			{BOARD_TYPE_LABEL[layoutMode]}
		</span>

		<div className="flex items-center gap-1">
			<Button className={TOOL} onClick={onUndo} disabled={!canUndo} title="Undo" aria-label="Undo">
				<Undo2 className="h-4 w-4" />
			</Button>
			<Button className={TOOL} onClick={onRedo} disabled={!canRedo} title="Redo" aria-label="Redo">
				<Redo2 className="h-4 w-4" />
			</Button>
			<Button
				className={TOOL}
				onClick={onDelete}
				disabled={!hasSelection}
				title="Delete selection"
				aria-label="Delete selection"
			>
				<Trash2 className="h-4 w-4" />
			</Button>
		</div>

		<div className="flex items-center gap-1" role="group" aria-label="Pointer tool">
			<Button
				className={`${TOOL} ${tool === "select" ? TOGGLED : ""}`}
				aria-pressed={tool === "select"}
				onClick={() => onTool("select")}
				title="Select: drag on empty space to box-select (hold Shift for this in Pan)"
			>
				<MousePointer2 className="h-4 w-4" />
				<Label>Select</Label>
			</Button>
			<Button
				className={`${TOOL} ${tool === "pan" ? TOGGLED : ""}`}
				aria-pressed={tool === "pan"}
				onClick={() => onTool("pan")}
				title="Pan: drag on empty space to move the view"
			>
				<Hand className="h-4 w-4" />
				<Label>Pan</Label>
			</Button>
		</div>

		<div className="flex items-center gap-1">
			<Button
				className={`${TOOL} ${snapToGrid ? TOGGLED : ""}`}
				aria-pressed={snapToGrid}
				onClick={onToggleSnap}
				title="Snap to grid"
			>
				<Grid3x3 className="h-4 w-4" />
				<Label>Snap</Label>
			</Button>
			<Button
				className={`${TOOL} ${showMinimap ? TOGGLED : ""}`}
				aria-pressed={showMinimap}
				onClick={onToggleMinimap}
				title="Minimap"
			>
				<MapIcon className="h-4 w-4" />
				<Label>Map</Label>
			</Button>
		</div>

		{onSeed && (
			<Button className={TOOL} onClick={onSeed} title="Dev only: replace with 500 nodes">
				Seed 500
			</Button>
		)}

		<div className="ml-auto flex items-center gap-2">
			<SaveIndicator status={status} />
			<ShortcutsPopover />
			<Button
				className={`${TOOL} ${panelOpen ? TOGGLED : ""}`}
				aria-pressed={panelOpen}
				onClick={onTogglePanel}
				title="Structure panel"
				aria-label="Structure panel"
			>
				<PanelRight className="h-4 w-4" />
				<Label>Structure</Label>
			</Button>
		</div>
	</div>
);

export default CanvasToolbar;
