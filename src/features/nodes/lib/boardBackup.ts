import JSZip from "jszip";
import { listBoards, mergeBoards, type BoardMergeResult } from "@src/lib/db/boardsRepo";
import {
	BOARD_LAYOUT_MODES,
	BOARD_NODE_TYPES,
	BOARD_SHAPES,
	BOARD_TEXT_MAX,
	type Board,
	type BoardEdge,
	type BoardLayoutMode,
	type BoardNode,
	type BoardNodeType,
	type BoardShape,
} from "@src/lib/db/types";
import { SCHEMA_VERSION } from "@src/lib/utils/schemaVersion";
import { UploadError } from "@src/lib/utils/uploadError";
import { isBoardColor } from "@src/features/nodes/lib/palette";

export const BOARDS_BACKUP_FILE = "boards-backup.json";

export interface BoardsBackup {
	schemaVersion: number;
	boards: Board[];
}

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
	typeof value === "string" && value.length > 0;

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

const isNodeType = (value: unknown): value is BoardNodeType =>
	typeof value === "string" && (BOARD_NODE_TYPES as readonly string[]).includes(value);

const isLayoutMode = (value: unknown): value is BoardLayoutMode =>
	typeof value === "string" && (BOARD_LAYOUT_MODES as readonly string[]).includes(value);

const isShape = (value: unknown): value is BoardShape =>
	typeof value === "string" && (BOARD_SHAPES as readonly string[]).includes(value);

// --- Export ---------------------------------------------------------------

export const serializeBoards = (boards: Board[]): BoardsBackup => ({
	schemaVersion: SCHEMA_VERSION,
	boards,
});

export const buildBoardsBackup = async (): Promise<BoardsBackup> =>
	serializeBoards(await listBoards());

// --- Import: validation ---------------------------------------------------

/** Reports the first problem with a node, or null. */
const checkNode = (value: unknown): string | null => {
	if (!isRecord(value)) return "is not an object";
	if (!isNonEmptyString(value.id)) return 'is missing an "id"';
	if (!isNodeType(value.type)) return 'has an unknown "type"';
	if (
		!isRecord(value.position) ||
		!isFiniteNumber(value.position.x) ||
		!isFiniteNumber(value.position.y)
	) {
		return 'has an invalid "position"';
	}
	for (const key of ["width", "height"] as const) {
		const size = value[key];
		if (size !== undefined && !(isFiniteNumber(size) && size > 0)) {
			return `has an invalid "${key}"`;
		}
	}
	if (!isRecord(value.data)) return 'is missing its "data"';
	const { title, text, color, shape } = value.data;
	if (!isBoardColor(color)) return 'has an unknown "color"';
	if (title !== undefined && typeof title !== "string") return 'has an invalid "title"';
	if (typeof title === "string" && title.length > BOARD_TEXT_MAX) {
		return `has a title over ${BOARD_TEXT_MAX} characters`;
	}
	if (text !== undefined && typeof text !== "string") return 'has invalid "text"';
	if (typeof text === "string" && text.length > BOARD_TEXT_MAX) {
		return `has more than ${BOARD_TEXT_MAX} characters of text`;
	}
	if (shape !== undefined && !isShape(shape)) return 'has an unknown "shape"';
	return null;
};

const checkEdge = (value: unknown, nodeIds: ReadonlySet<string>): string | null => {
	if (!isRecord(value)) return "is not an object";
	if (!isNonEmptyString(value.id)) return 'is missing an "id"';
	if (!isNonEmptyString(value.source) || !nodeIds.has(value.source)) {
		return "starts at a node that does not exist";
	}
	if (!isNonEmptyString(value.target) || !nodeIds.has(value.target)) {
		return "ends at a node that does not exist";
	}
	if (value.label !== undefined && typeof value.label !== "string") {
		return 'has an invalid "label"';
	}
	if (value.arrow !== undefined && typeof value.arrow !== "boolean") {
		return 'has an invalid "arrow"';
	}
	return null;
};

/** Pushes "<where> <problem>" for every bad item and flags repeated ids. */
const checkList = (
	list: unknown,
	key: string,
	label: string,
	check: (item: unknown) => string | null,
	where: string,
	problems: string[],
): unknown[] => {
	if (!Array.isArray(list)) {
		problems.push(`${where}: "${key}" must be a list`);
		return [];
	}
	const seen = new Set<unknown>();
	list.forEach((item, index) => {
		const problem = check(item);
		if (problem) {
			problems.push(`${where}: ${label} ${index + 1} ${problem}`);
			return;
		}
		const id = (item as JsonRecord).id;
		if (seen.has(id)) problems.push(`${where}: ${label} ${index + 1} repeats an id`);
		seen.add(id);
	});
	return list;
};

const checkViewport = (value: unknown): string | null =>
	isRecord(value) &&
	isFiniteNumber(value.x) &&
	isFiniteNumber(value.y) &&
	isFiniteNumber(value.zoom) &&
	value.zoom > 0
		? null
		: 'has an invalid "viewport"';

/** Rebuilds a validated board from known fields only, so stray keys are not stored. */
const normalizeBoard = (raw: JsonRecord): Board => {
	const nodes = (raw.nodes as BoardNode[]).map((node): BoardNode => {
		const out: BoardNode = {
			id: node.id,
			type: node.type,
			position: { x: node.position.x, y: node.position.y },
			data: { color: node.data.color },
		};
		if (node.width !== undefined) out.width = node.width;
		if (node.height !== undefined) out.height = node.height;
		if (node.data.title !== undefined) out.data.title = node.data.title;
		if (node.data.text !== undefined) out.data.text = node.data.text;
		if (node.data.shape !== undefined) out.data.shape = node.data.shape;
		return out;
	});
	const edges = (raw.edges as BoardEdge[]).map((edge): BoardEdge => {
		const out: BoardEdge = {
			id: edge.id,
			source: edge.source,
			target: edge.target,
		};
		if (edge.label) out.label = edge.label;
		if (edge.arrow) out.arrow = true;
		return out;
	});
	const viewport = raw.viewport as Board["viewport"];
	const board: Board = {
		id: raw.id as string,
		name: raw.name as string,
		nodes,
		edges,
		viewport: { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
		createdAt: raw.createdAt as number,
		updatedAt: raw.updatedAt as number,
	};
	// Backups from before v2 have none of these; a missing layoutMode means "free".
	if (isLayoutMode(raw.layoutMode)) board.layoutMode = raw.layoutMode;
	if (typeof raw.outline === "string" && raw.outline) board.outline = raw.outline;
	if (typeof raw.treeRootId === "string" && raw.treeRootId) board.treeRootId = raw.treeRootId;
	if (Number.isInteger(raw.gridColumns) && (raw.gridColumns as number) > 0) {
		board.gridColumns = raw.gridColumns as number;
	}
	return board;
};

/**
 * Validates a parsed backup and returns boards ready to merge. Nothing is
 * stored here. Any malformed board rejects the whole file with a message
 * saying which board and item, so a bad file never leaves a half import.
 */
export const parseBoardsBackup = (raw: unknown): Board[] => {
	if (!isRecord(raw) || !("boards" in raw)) {
		throw new UploadError("This doesn't look like a Boards backup file");
	}
	if (raw.schemaVersion !== undefined) {
		if (!isFiniteNumber(raw.schemaVersion)) {
			throw new UploadError("This backup has an invalid schemaVersion");
		}
		if (raw.schemaVersion > SCHEMA_VERSION) {
			throw new UploadError(
				"This backup was made by a newer version of the app. Update the app and try again.",
			);
		}
	}
	if (!Array.isArray(raw.boards)) {
		throw new UploadError('This backup has invalid data: "boards" must be a list');
	}

	const problems: string[] = [];
	const boardIds = new Set<string>();

	raw.boards.forEach((board: unknown, index) => {
		const fallback = `Board ${index + 1}`;
		if (!isRecord(board)) {
			problems.push(`${fallback} is not an object`);
			return;
		}
		const where = typeof board.name === "string" && board.name ? `Board "${board.name}"` : fallback;

		if (!isNonEmptyString(board.id)) problems.push(`${where} is missing an "id"`);
		else if (boardIds.has(board.id)) problems.push(`${where} repeats a board id`);
		else boardIds.add(board.id);

		if (typeof board.name !== "string" || !board.name.trim()) {
			problems.push(`${where} is missing its "name"`);
		}
		if (!isFiniteNumber(board.createdAt) || !isFiniteNumber(board.updatedAt)) {
			problems.push(`${where} has an invalid timestamp`);
		}
		if (board.layoutMode !== undefined && !isLayoutMode(board.layoutMode)) {
			problems.push(`${where} has an unknown "layoutMode"`);
		}
		if (board.outline !== undefined && typeof board.outline !== "string") {
			problems.push(`${where} has an invalid "outline"`);
		}
		if (board.treeRootId !== undefined && typeof board.treeRootId !== "string") {
			problems.push(`${where} has an invalid "treeRootId"`);
		}
		if (
			board.gridColumns !== undefined &&
			!(Number.isInteger(board.gridColumns) && (board.gridColumns as number) > 0)
		) {
			problems.push(`${where} has an invalid "gridColumns"`);
		}
		const viewportProblem = checkViewport(board.viewport);
		if (viewportProblem) problems.push(`${where} ${viewportProblem}`);

		const before = problems.length;
		const nodes = checkList(board.nodes, "nodes", "node", checkNode, where, problems);
		if (problems.length > before) return; // Edges can't be checked without valid nodes.
		const nodeIds = new Set(nodes.map((node) => (node as JsonRecord).id as string));
		checkList(board.edges, "edges", "edge", (edge) => checkEdge(edge, nodeIds), where, problems);
	});

	if (problems.length > 0) {
		const shown = problems.slice(0, 3).join("; ");
		const more = problems.length > 3 ? ` (and ${problems.length - 3} more)` : "";
		throw new UploadError(`Backup has invalid data: ${shown}${more}`);
	}

	return (raw.boards as JsonRecord[]).map(normalizeBoard);
};

export const describeBoardsImport = (result: BoardMergeResult): string => {
	if (result.added === 0) {
		return result.skipped > 0
			? `Nothing new to import (${result.skipped} already existed)`
			: "The backup was empty";
	}
	const noun = result.added === 1 ? "board" : "boards";
	const note = result.skipped > 0 ? ` (${result.skipped} duplicates skipped)` : "";
	return `Imported ${result.added} ${noun}${note}`;
};

const isZip = (file: File): boolean =>
	file.type === "application/zip" ||
	file.type === "application/x-zip-compressed" ||
	(file.name ?? "").toLowerCase().endsWith(".zip");

/** The backup JSON inside a boards ZIP (also found inside the full Home download). */
const readBackupText = async (file: File): Promise<string> => {
	if (!isZip(file)) return file.text();
	let zip: JSZip;
	try {
		zip = await JSZip.loadAsync(file);
	} catch {
		throw new UploadError("That file is not a valid ZIP");
	}
	const entry = Object.values(zip.files).find(
		(item) => !item.dir && (item.name === BOARDS_BACKUP_FILE || item.name.endsWith(`/${BOARDS_BACKUP_FILE}`)),
	);
	if (!entry) throw new UploadError(`This ZIP has no ${BOARDS_BACKUP_FILE}`);
	return entry.async("string");
};

/** Reads a backup file (JSON, or a ZIP holding it) and merges it into the stored boards. Returns the message to show. */
export const importBoardsFile = async (file: File): Promise<string> => {
	const text = await readBackupText(file);
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		throw new UploadError("That file is not valid JSON");
	}
	const boards = parseBoardsBackup(raw);
	return describeBoardsImport(await mergeBoards(boards));
};
