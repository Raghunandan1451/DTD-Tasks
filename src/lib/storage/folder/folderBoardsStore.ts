import { newId } from "@src/lib/db/newId";
import type { Board } from "@src/lib/db/types";
import { parseBoardsBackup } from "@src/features/nodes/lib/boardBackup";
import { BOARDS_ROOT, isHiddenName, toSafeName } from "@src/lib/storage/folder/fileNames";
import type { NotesFs } from "@src/lib/storage/folder/notesIndex";
import { scopedFs } from "@src/lib/storage/folder/scopedFs";
import {
	NOT_FOUND_MESSAGE,
	buildBoard,
	byRecentlyUpdated,
	copyOfBoard,
	defaultBoardName,
	renamedBoard,
	withBoardContent,
} from "@src/lib/storage/boardLogic";
import type { BoardMergeResult, BoardsStore } from "@src/lib/storage/types";
import { SCHEMA_VERSION } from "@src/lib/utils/schemaVersion";

const SUFFIX = ".board.json";
const STATE_FILE = ".dtdtasks/boards-state.json";

/** A file in Boards/ that is not a usable board, or a board that had to get a new id. */
export interface BoardProblem {
	file: string;
	reason: string;
}

export interface FolderBoardsStore extends BoardsStore {
	/** Files that could not be read, and boards that had to get a new id. Never deleted or overwritten. */
	problems(): Promise<BoardProblem[]>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** One board per file: `{ schemaVersion, board }`, the board in the validated backup shape. */
const serialize = (board: Board): string =>
	JSON.stringify({ schemaVersion: SCHEMA_VERSION, board }, null, 2);

const parseFile = (text: string): Board => {
	const raw: unknown = JSON.parse(text);
	if (!isRecord(raw) || !("board" in raw)) throw new Error("Not a board file");
	return parseBoardsBackup({ schemaVersion: raw.schemaVersion, boards: [raw.board] })[0];
};

/**
 * Boards kept as `<data folder>/Boards/<name>.board.json`, one file each. The
 * id inside the file is the identity; the file name is only a label made from
 * the board's name. The whole set is read once and held in memory; every change
 * rewrites just that board's file, through one queue so an older save can never
 * land after a newer one.
 */
export const createFolderBoardsStore = (
	fs: NotesFs,
	root: string = BOARDS_ROOT,
): FolderBoardsStore => {
	const dir = scopedFs(fs, root);
	const boards = new Map<string, Board>();
	/** id -> file name, and the board name that file name was made from. */
	const fileOf = new Map<string, string>();
	const derivedFrom = new Map<string, string>();
	/** Lower-case names of every file in the folder, boards and unreadable ones alike. */
	const taken = new Set<string>();
	const problems: BoardProblem[] = [];
	let lastBoardId: string | null = null;
	let loading: Promise<void> | null = null;
	let queue: Promise<unknown> = Promise.resolve();

	const enqueue = <T>(job: () => Promise<T>): Promise<T> => {
		const run = queue.then(job, job);
		queue = run.catch(() => undefined);
		return run;
	};

	const fileNameFor = (name: string, own?: string): string => {
		const base = toSafeName(name);
		for (let n = 1; ; n++) {
			const candidate = `${n === 1 ? base : `${base} (${n})`}${SUFFIX}`;
			const key = candidate.toLowerCase();
			if (!taken.has(key) || key === own?.toLowerCase()) return candidate;
		}
	};

	/** Makes the file match the board: renames it if the board was renamed, then writes it. */
	const syncFile = async (id: string): Promise<void> => {
		const board = boards.get(id);
		if (!board) return;
		let file = fileOf.get(id);
		if (!file) {
			file = fileNameFor(board.name);
			taken.add(file.toLowerCase());
		} else if (derivedFrom.get(id) !== board.name) {
			const wanted = fileNameFor(board.name, file);
			if (wanted !== file) {
				try {
					await dir.rename(file, wanted);
					taken.delete(file.toLowerCase());
					taken.add(wanted.toLowerCase());
					file = wanted;
				} catch {
					/* keep the old file name; the content below is still saved */
				}
			}
		}
		fileOf.set(id, file);
		derivedFrom.set(id, board.name);
		await dir.writeText(file, serialize(board));
	};

	const persist = (id: string) => enqueue(() => syncFile(id));

	const load = async (): Promise<void> => {
		await fs.mkdir(root);
		const entries = (await dir.list("")).sort((a, b) => a.name.localeCompare(b.name));
		for (const entry of entries) taken.add(entry.name.toLowerCase());
		const reassigned: string[] = [];
		for (const entry of entries) {
			if (entry.kind !== "file" || isHiddenName(entry.name)) continue;
			if (!entry.name.toLowerCase().endsWith(SUFFIX)) continue;
			try {
				let board = parseFile((await dir.readText(entry.name)) ?? "");
				if (boards.has(board.id)) {
					problems.push({
						file: entry.name,
						reason: "Another board file has the same id, so this one got a new id",
					});
					board = { ...board, id: newId() };
					reassigned.push(board.id);
				}
				boards.set(board.id, board);
				fileOf.set(board.id, entry.name);
				derivedFrom.set(board.id, board.name);
			} catch (error) {
				problems.push({
					file: entry.name,
					reason: error instanceof Error ? error.message : "Could not be read",
				});
			}
		}
		for (const id of reassigned) await persist(id);
		try {
			const state: unknown = JSON.parse((await fs.readText(STATE_FILE)) ?? "null");
			if (isRecord(state) && typeof state.lastBoardId === "string") {
				lastBoardId = state.lastBoardId;
			}
		} catch {
			/* no remembered board */
		}
	};

	const ready = (): Promise<void> => {
		loading ??= load().catch((error) => {
			loading = null; // try again next time
			throw error;
		});
		return loading;
	};

	const need = (id: string): Board => {
		const existing = boards.get(id);
		if (!existing) throw new Error(NOT_FOUND_MESSAGE);
		return existing;
	};

	return {
		problems: async () => {
			await ready();
			return [...problems];
		},
		listBoards: async () => {
			await ready();
			return [...boards.values()].map((b) => structuredClone(b)).sort(byRecentlyUpdated);
		},
		getBoard: async (id) => {
			await ready();
			const board = boards.get(id);
			return board ? structuredClone(board) : null;
		},
		countBoards: async () => {
			await ready();
			return boards.size;
		},
		createBoard: async (name = defaultBoardName(), layoutMode = "free", initial = {}) => {
			await ready();
			const board = buildBoard(newId(), Date.now(), name, layoutMode, initial);
			boards.set(board.id, structuredClone(board));
			await persist(board.id);
			return board;
		},
		saveBoard: async (board) => {
			await ready();
			const next: Board = { ...board, updatedAt: Date.now() };
			boards.set(next.id, structuredClone(next));
			await persist(next.id);
			return next;
		},
		renameBoard: async (id, name) => {
			await ready();
			const next = renamedBoard(need(id), name, Date.now());
			boards.set(id, structuredClone(next));
			await persist(id);
			return next;
		},
		duplicateBoard: async (id) => {
			await ready();
			const copy = copyOfBoard(need(id), newId(), Date.now());
			boards.set(copy.id, structuredClone(copy));
			await persist(copy.id);
			return copy;
		},
		deleteBoard: async (id) => {
			await ready();
			const file = fileOf.get(id);
			boards.delete(id);
			fileOf.delete(id);
			derivedFrom.delete(id);
			if (!file) return;
			await enqueue(async () => {
				await dir.trash(file);
				taken.delete(file.toLowerCase());
			});
		},
		mergeBoards: async (incoming) => {
			await ready();
			const result: BoardMergeResult = { added: 0, skipped: 0 };
			for (const board of incoming) {
				if (boards.has(board.id)) {
					result.skipped++;
					continue;
				}
				boards.set(board.id, structuredClone(board));
				await persist(board.id);
				result.added++;
			}
			return result;
		},
		getLastBoardId: async () => {
			await ready();
			return lastBoardId;
		},
		setLastBoardId: async (id) => {
			await ready();
			lastBoardId = id;
			await enqueue(() => fs.writeText(STATE_FILE, JSON.stringify({ lastBoardId: id })));
		},
		saveBoardContent: async (id, content, options = {}) => {
			await ready();
			const existing = boards.get(id);
			if (!existing) return null;
			const next = withBoardContent(existing, content, Date.now(), options.touch !== false);
			boards.set(id, structuredClone(next));
			await persist(id);
			return next;
		},
	};
};
