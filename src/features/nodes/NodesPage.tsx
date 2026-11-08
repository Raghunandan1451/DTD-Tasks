import "@xyflow/react/dist/style.css";
import { useCallback, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";
import ResizeHandle from "@src/components/ui/ResizeHandle";
import { useResizablePanel } from "@src/lib/hooks/useResizablePanel";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import { ConfirmationModal } from "@src/components/shared/dialog/ConfirmModal";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import useNotifications from "@src/lib/hooks/useNotifications";
import { useConfirmationModal } from "@src/lib/hooks/useConfirmDialog";
import { handleBoardsExport } from "@src/lib/utils/downloadHandler";
import { getBoard, listBoards } from "@src/lib/db/boardsRepo";
import { importBoardsFile, serializeBoards } from "@src/features/nodes/lib/boardBackup";
import {
	buildBoardExports,
	buildScenes,
	type ImageFormat,
} from "@src/features/nodes/lib/boardExport";
import { useBoards } from "@src/features/nodes/lib/useBoards";
import BoardCanvas from "@src/features/nodes/components/BoardCanvas";
import BoardDownloadModal, {
	type BoardDownloadScope,
} from "@src/features/nodes/components/BoardDownloadModal";
import BoardList from "@src/features/nodes/components/BoardList";

const NodesPage: React.FC = () => {
	const { notifications, showNotification } = useNotifications();
	const confirmation = useConfirmationModal();
	const boards = useBoards(showNotification);
	const [boardsOpen, setBoardsOpen] = useState(false);
	const sidebar = useResizablePanel();

	const [downloadOpen, setDownloadOpen] = useState(false);
	const [downloading, setDownloading] = useState(false);
	const [selectedCount, setSelectedCount] = useState(0);
	// The open canvas tells us which nodes are selected (see BoardCanvas).
	const readSelection = useRef<(() => Set<string>) | null>(null);
	const registerSelection = useCallback((read: (() => Set<string>) | null) => {
		readSelection.current = read;
	}, []);

	const openDownload = () => {
		setSelectedCount(readSelection.current?.().size ?? 0);
		setDownloadOpen(true);
	};

	const handleDownload = async (scope: BoardDownloadScope, format: ImageFormat) => {
		setDownloading(true);
		try {
			// Include edits that haven't autosaved yet.
			await boards.flushPending();
			const activeId = boards.activeId;
			const selected = readSelection.current?.() ?? new Set<string>();

			let chosen = await listBoards();
			if (scope === "current") {
				const current = activeId ? await getBoard(activeId) : null;
				if (!current) {
					showNotification("Open a board first", "error");
					return;
				}
				chosen = [current];
			}

			// A selection only narrows the open board's image; nothing selected means all of it.
			// The JSON in the ZIP is always the whole board.
			const scenes = buildScenes(
				chosen,
				scope === "current" && activeId ? { boardId: activeId, nodeIds: selected } : undefined,
			);
			const pictures = await buildBoardExports(scenes, format);
			if (pictures.images.length === 0) {
				showNotification("No images: the boards have no nodes, so only the JSON is included", "info");
			}
			await handleBoardsExport(serializeBoards(chosen), pictures, showNotification);
			setDownloadOpen(false);
		} catch (error) {
			console.error("Boards download error:", error);
			showNotification("Failed to download boards", "error");
		} finally {
			setDownloading(false);
		}
	};

	const handleUpload = async (file: File): Promise<string> => {
		await boards.flushPending();
		const message = await importBoardsFile(file);
		await boards.refresh();
		return message;
	};

	const handleDelete = async (id: string) => {
		const name = boards.boards.find((board) => board.id === id)?.name ?? "this board";
		const confirmed = await confirmation.confirm({
			title: "Delete board",
			message: `Delete "${name}"? Its nodes and connections will be removed. This cannot be undone.`,
			confirmText: "Delete",
			type: "danger",
		});
		if (confirmed) await boards.remove(id);
	};

	return (
		<>
			<div className="flex h-full flex-col text-gray-900 dark:text-white">
				<TitleWithButton
					heading="Boards"
					buttonText="Download"
					onDownload={openDownload}
					onUpload={handleUpload}
					showUpload
					uploadAccept=".json,.zip"
					uploadText="Upload backup"
					showNotification={showNotification}
				/>
				<button
					type="button"
					onClick={() => setBoardsOpen((open) => !open)}
					aria-expanded={boardsOpen}
					className="flex min-h-10 items-center gap-2 border-b border-white/20 bg-white/10 px-3 text-left text-sm text-gray-800 dark:bg-gray-900/20 dark:text-gray-100 md:hidden"
				>
					<Menu className="h-4 w-4" />
					<span className="truncate">{boards.active?.name ?? "Boards"}</span>
				</button>
				<div className="relative flex min-h-0 flex-1 flex-row border border-white/20 dark:border-white/10">
					<aside
						aria-label="Boards"
						ref={sidebar.containerRef}
						className={`${
							boardsOpen
								? "absolute inset-y-0 left-0 z-30 flex w-72 max-w-[85%] shadow-2xl"
								: "hidden"
						} shrink-0 flex-col border-r border-white/20 bg-white/90 dark:bg-gray-900/90 md:relative md:inset-auto md:z-auto md:flex md:w-[var(--boards-width)] md:max-w-none md:bg-white/10 md:shadow-none md:dark:bg-gray-900/20`}
						style={{ "--boards-width": `${sidebar.width}px` } as React.CSSProperties}
					>
						<BoardList
							boards={boards.boards}
							activeId={boards.activeId}
							onOpen={(id) => {
								setBoardsOpen(false);
								void boards.open(id);
							}}
							onCreate={(mode) => {
								setBoardsOpen(false);
								void boards.create(undefined, mode);
							}}
							onRename={boards.rename}
							onDuplicate={(id) => {
								setBoardsOpen(false);
								void boards.duplicate(id);
							}}
							onDelete={handleDelete}
						/>
						<div className="hidden md:block">
							<ResizeHandle label="Resize boards list" onPointerDown={sidebar.startDragging} />
						</div>
					</aside>
					<div className="min-h-[24rem] min-w-0 flex-1">
						{boards.active ? (
							<ReactFlowProvider key={boards.active.id}>
								<BoardCanvas
									board={boards.active}
									onSaved={boards.noteSaved}
									onError={(message) => showNotification(message, "error")}
									registerFlush={boards.registerFlush}
									registerSelection={registerSelection}
								/>
							</ReactFlowProvider>
						) : (
							<p className="p-4 text-sm text-gray-600 dark:text-gray-300">
								{boards.loading
									? "Loading boards…"
									: "No boards yet. Choose a type (Free, Tree, Graph or Grid) in the Boards list and press New."}
							</p>
						)}
					</div>
				</div>
			</div>
			{downloadOpen && (
				<BoardDownloadModal
					activeName={boards.active?.name}
					boardCount={boards.boards.length}
					selectedCount={selectedCount}
					busy={downloading}
					onDownload={(scope, format) => void handleDownload(scope, format)}
					onClose={() => setDownloadOpen(false)}
				/>
			)}
			<ConfirmationModal
				isOpen={confirmation.isOpen}
				options={confirmation.options}
				onConfirm={confirmation.handleConfirm}
				onCancel={confirmation.handleCancel}
			/>
			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default NodesPage;
