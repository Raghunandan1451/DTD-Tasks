import type { Board, BoardLayoutMode, BoardViewport } from "@src/lib/db/types";
import type { BoardContent } from "@src/lib/storage/types";

/**
 * The rules for building and updating a board record, with no storage in them.
 * Every BoardsStore uses these so a board behaves the same wherever it is kept.
 */

export const NOT_FOUND_MESSAGE = "That board no longer exists.";

const DEFAULT_BOARD_NAME = "Untitled board";
const DEFAULT_VIEWPORT: BoardViewport = { x: 0, y: 0, zoom: 1 };

export const cleanBoardName = (name: string): string =>
	name.trim() || DEFAULT_BOARD_NAME;

export const defaultBoardName = (): string => DEFAULT_BOARD_NAME;

export const buildBoard = (
	id: string,
	now: number,
	name: string,
	layoutMode: BoardLayoutMode,
	initial: Partial<Pick<Board, "nodes" | "edges" | "gridColumns">>,
): Board => ({
	id,
	name: cleanBoardName(name),
	nodes: initial.nodes ?? [],
	edges: initial.edges ?? [],
	viewport: { ...DEFAULT_VIEWPORT },
	layoutMode,
	...(initial.gridColumns ? { gridColumns: initial.gridColumns } : {}),
	createdAt: now,
	updatedAt: now,
});

export const renamedBoard = (existing: Board, name: string, now: number): Board => ({
	...existing,
	name: cleanBoardName(name),
	updatedAt: now,
});

export const copyOfBoard = (existing: Board, id: string, now: number): Board => ({
	...structuredClone(existing),
	id,
	name: `${existing.name} (copy)`,
	createdAt: now,
	updatedAt: now,
});

/** Newest first, the order the board list shows. */
export const byRecentlyUpdated = (a: Board, b: Board): number =>
	b.updatedAt - a.updatedAt;

/**
 * The stored board with the canvas content applied. Name and createdAt are
 * kept (so a rename made while the canvas is open is never overwritten).
 * `touch: false` leaves `updatedAt` alone, for viewport-only changes.
 */
export const withBoardContent = (
	existing: Board,
	content: BoardContent,
	now: number,
	touch: boolean,
): Board => {
	const next: Board = {
		...existing,
		nodes: content.nodes,
		edges: content.edges,
		viewport: content.viewport,
		updatedAt: touch ? now : existing.updatedAt,
	};
	// An absent key clears the field, so removing the tree root really removes it.
	delete next.layoutMode;
	delete next.outline;
	delete next.treeRootId;
	delete next.gridColumns;
	delete next.gridRowLabels;
	delete next.gridColumnLabels;
	delete next.gridCornerLabel;
	if (content.layoutMode) next.layoutMode = content.layoutMode;
	if (content.outline) next.outline = content.outline;
	if (content.treeRootId) next.treeRootId = content.treeRootId;
	if (content.gridColumns) next.gridColumns = content.gridColumns;
	if (content.gridRowLabels?.length) next.gridRowLabels = content.gridRowLabels;
	if (content.gridColumnLabels?.length) next.gridColumnLabels = content.gridColumnLabels;
	if (content.gridCornerLabel) next.gridCornerLabel = content.gridCornerLabel;
	return next;
};
