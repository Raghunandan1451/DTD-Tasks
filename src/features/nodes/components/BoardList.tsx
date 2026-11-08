import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import { BOARD_LAYOUT_MODES, type BoardLayoutMode } from "@src/lib/db/types";
import type { BoardSummary } from "@src/features/nodes/lib/useBoards";

import { BOARD_TYPE_LABEL } from "@src/features/nodes/lib/labels";

interface BoardListProps {
	boards: BoardSummary[];
	activeId: string | null;
	onOpen: (id: string) => void;
	onCreate: (layoutMode: BoardLayoutMode) => void;
	onRename: (id: string, name: string) => void;
	onDuplicate: (id: string) => void;
	onDelete: (id: string) => void;
}

const ICON_BUTTON =
	"rounded p-1 text-gray-600 hover:bg-black/10 dark:text-gray-300 dark:hover:bg-white/10";

const BoardList: React.FC<BoardListProps> = ({
	boards,
	activeId,
	onOpen,
	onCreate,
	onRename,
	onDuplicate,
	onDelete,
}) => {
	const [renamingId, setRenamingId] = useState<string | null>(null);
	// The type is picked here, once, and cannot be changed on the board afterwards.
	const [newType, setNewType] = useState<BoardLayoutMode>("free");

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex flex-wrap items-center justify-between gap-1 p-2">
				<h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Boards</h2>
				<div className="flex items-center gap-1">
					<select
						aria-label="New board type"
						value={newType}
						onChange={(event) => setNewType(event.target.value as BoardLayoutMode)}
						className="min-h-9 rounded-md bg-black/5 px-1 text-xs text-gray-800 dark:bg-white/10 dark:text-gray-100"
					>
						{BOARD_LAYOUT_MODES.map((mode) => (
							<option key={mode} value={mode} className="text-black">
								{BOARD_TYPE_LABEL[mode]}
							</option>
						))}
					</select>
					<Button
						className="btn-primary flex min-h-9 items-center gap-1 !p-1.5 text-xs"
						onClick={() => onCreate(newType)}
						title={`New ${BOARD_TYPE_LABEL[newType]} board`}
					>
						<Plus className="h-4 w-4" />
						New
					</Button>
				</div>
			</div>
			<ul className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
				{boards.map((board) => {
					const isActive = board.id === activeId;
					return (
						<li
							key={board.id}
							className={`group mb-1 rounded-lg px-2 py-1.5 ${
								isActive
									? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300"
									: "text-gray-800 hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10"
							}`}
						>
							{renamingId === board.id ? (
								<input
									autoFocus
									aria-label="Board name"
									defaultValue={board.name}
									maxLength={80}
									onFocus={(event) => event.target.select()}
									onBlur={(event) => {
										setRenamingId(null);
										const name = event.target.value.trim();
										if (name && name !== board.name) onRename(board.id, name);
									}}
									onKeyDown={(event) => {
										if (event.key === "Enter") event.currentTarget.blur();
										if (event.key === "Escape") setRenamingId(null);
									}}
									className="w-full rounded bg-white/70 px-1 py-0.5 text-sm text-gray-900 outline-none ring-2 ring-cyan-400 dark:bg-gray-800 dark:text-gray-100"
								/>
							) : (
								<button
									type="button"
									onClick={() => onOpen(board.id)}
									aria-current={isActive ? "true" : undefined}
									className="block w-full text-left"
								>
									<span className="block truncate text-sm font-medium">{board.name}</span>
									<span className="block text-xs opacity-70">
										{BOARD_TYPE_LABEL[board.layoutMode]} · {board.nodeCount}{" "}
										{board.nodeCount === 1 ? "node" : "nodes"} ·{" "}
										{formatDistanceToNow(board.updatedAt, { addSuffix: true })}
									</span>
								</button>
							)}
							{renamingId !== board.id && (
								<div className="mt-1 flex gap-0.5 md:opacity-0 md:transition-opacity md:group-focus-within:opacity-100 md:group-hover:opacity-100 [&_button]:min-h-9 [&_button]:min-w-9 md:[&_button]:min-h-0 md:[&_button]:min-w-0">
									<Button
										className={ICON_BUTTON}
										title="Rename"
										aria-label={`Rename ${board.name}`}
										onClick={() => setRenamingId(board.id)}
									>
										<Pencil className="h-3.5 w-3.5" />
									</Button>
									<Button
										className={ICON_BUTTON}
										title="Duplicate"
										aria-label={`Duplicate ${board.name}`}
										onClick={() => onDuplicate(board.id)}
									>
										<Copy className="h-3.5 w-3.5" />
									</Button>
									<Button
										className={`${ICON_BUTTON} hover:!text-red-600`}
										title="Delete"
										aria-label={`Delete ${board.name}`}
										onClick={() => onDelete(board.id)}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							)}
						</li>
					);
				})}
			</ul>
		</div>
	);
};

export default BoardList;
