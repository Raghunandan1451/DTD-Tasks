import type JSZip from "jszip";
import type { Board, JournalEntry, MarkdownLogEntry } from "@src/lib/db/types";
import type { FinanceState } from "@src/features/finance/type";
import type { FileState } from "@src/features/markdown/type";
import type { ExpensesState } from "@src/lib/store/slices/expensesSlice";
import { FORMAT_VERSION, MARKER_FILE } from "@src/lib/desktop/types";
import { createMemoryFs, type MemoryFs } from "@src/lib/storage/memoryFs";
import { createFolderNotesStore } from "@src/lib/storage/folder/folderNotesStore";
import { createFolderBoardsStore } from "@src/lib/storage/folder/folderBoardsStore";
import { createFolderFinanceStore } from "@src/lib/storage/folder/folderFinanceStore";
import { createFolderJournalStore } from "@src/lib/storage/folder/folderJournalStore";
import { createFolderActivityStore } from "@src/lib/storage/folder/folderActivityStore";
import {
	BOARDS_ROOT,
	FINANCE_ROOT,
	JOURNAL_ROOT,
	NOTES_ROOT,
} from "@src/lib/storage/folder/fileNames";

/** What the browser holds, in the pieces a data folder is made of. */
export interface FolderContents {
	notes?: FileState;
	boards?: Board[];
	finance?: FinanceState;
	expenses?: ExpensesState;
	journal?: JournalEntry[];
	activity?: MarkdownLogEntry[];
}

/** What reading a data-folder ZIP gives back. A part the ZIP does not have is left out. */
export interface FolderZipData {
	notes?: FileState;
	boards?: Board[];
	finance?: FinanceState;
	expenses?: ExpensesState;
	journal?: JournalEntry[];
	activity?: MarkdownLogEntry[];
}

const END_OF_TIME = 4102444800000; // 2100-01-01
const FAR_PAST = "0000-01-01";
const FAR_FUTURE = "9999-12-31";

/**
 * Lays the data out as a desktop data folder: `Notes/`, `Boards/`, `Finance/`,
 * `Journal/<year>/` and `.dtdtasks/`. It goes through the very stores the desktop
 * app saves with, so the file names and contents match theirs exactly.
 */
export const buildFolderFiles = async (contents: FolderContents): Promise<MemoryFs> => {
	const fs = createMemoryFs();

	if (contents.notes && contents.notes.files.length > 0) {
		await createFolderNotesStore(fs).saveTree(contents.notes);
	}
	if (contents.boards?.length) {
		await createFolderBoardsStore(fs).mergeBoards(contents.boards);
	}
	if (contents.finance || contents.expenses?.expenses.length) {
		const finance = createFolderFinanceStore(fs);
		if (contents.finance) await finance.saveFinance(contents.finance);
		if (contents.expenses?.expenses.length) await finance.saveExpenses(contents.expenses);
	}
	if (contents.journal?.length) await createFolderJournalStore(fs).restore(contents.journal);
	if (contents.activity?.length) await createFolderActivityStore(fs).restore(contents.activity);

	// The marker is what makes the unzipped folder open without questions.
	fs.files.set(
		MARKER_FILE,
		JSON.stringify(
			{ app: "DTDTasks", formatVersion: FORMAT_VERSION, createdAt: new Date().toISOString() },
			null,
			2,
		),
	);
	return fs;
};

const isFolderFile = (name: string): boolean =>
	name === MARKER_FILE ||
	name.startsWith(`${NOTES_ROOT}/`) ||
	name.startsWith(`${JOURNAL_ROOT}/`) ||
	(name.startsWith(`${BOARDS_ROOT}/`) && name.endsWith(".board.json")) ||
	name === `${FINANCE_ROOT}/settings.json` ||
	name.startsWith(`${FINANCE_ROOT}/expenses/`);

/**
 * Where the data folder starts inside the ZIP: the top, or one folder down when
 * the person zipped the folder itself. Null when this is not a data folder.
 */
const folderPrefix = (zip: JSZip): string | null => {
	const names = Object.values(zip.files)
		.filter((entry) => !entry.dir)
		.map((entry) => entry.name);
	if (names.some(isFolderFile)) return "";
	const tops = new Set(names.map((name) => name.split("/")[0]));
	for (const top of tops) {
		const inside = names.filter((name) => name.startsWith(`${top}/`)).map((name) => name.slice(top.length + 1));
		if (inside.some(isFolderFile)) return `${top}/`;
	}
	return null;
};

/** True when the ZIP is laid out like a desktop data folder. */
export const isFolderZip = (zip: JSZip): boolean => folderPrefix(zip) !== null;

/** Reads a data-folder ZIP with the desktop stores, so it is checked the way the desktop app checks it. */
export const readFolderZip = async (zip: JSZip): Promise<FolderZipData> => {
	const fs = createMemoryFs();
	const prefix = folderPrefix(zip) ?? "";
	for (const entry of Object.values(zip.files)) {
		if (entry.dir || !entry.name.startsWith(prefix)) continue;
		if (!/\.(md|json)$/i.test(entry.name)) continue;
		fs.files.set(entry.name.slice(prefix.length), await entry.async("string"));
	}

	const data: FolderZipData = {};
	const notes = await createFolderNotesStore(fs).loadTree();
	if (notes) data.notes = notes;
	const boards = await createFolderBoardsStore(fs).listBoards();
	if (boards.length) data.boards = boards;
	const finance = createFolderFinanceStore(fs);
	const state = await finance.loadFinance();
	if (state) data.finance = state;
	const expenses = await finance.loadExpenses();
	if (expenses?.expenses.length) data.expenses = expenses;

	const journal = createFolderJournalStore(fs);
	const entries = await journal.inRange(0, END_OF_TIME);
	if (entries.length) data.journal = entries;
	const rows = await createFolderActivityStore(fs).inRange(FAR_PAST, FAR_FUTURE);
	if (rows.length) data.activity = rows;
	return data;
};
