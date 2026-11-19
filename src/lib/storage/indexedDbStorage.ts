import * as boardsRepo from "@src/lib/db/boardsRepo";
import { getValue, setValue } from "@src/lib/db/database";
import type { FileState } from "@src/features/markdown/type";
import type { FinanceState } from "@src/features/finance/type";
import type { ExpensesState } from "@src/lib/store/slices/expensesSlice";
import { indexedDbActivityStore } from "@src/lib/storage/indexedDbActivity";
import { indexedDbTimelineStore } from "@src/lib/storage/indexedDbTimeline";
import { indexedDbJournalStore } from "@src/lib/storage/indexedDbJournal";
import type {
	BoardsStore,
	FinanceStore,
	NotesStore,
	StorageProvider,
} from "@src/lib/storage/types";

/** Key the whole notes tree has always been saved under. Do not change it. */
export const NOTES_STORAGE_KEY = "redux_markdown_data";

export const indexedDbNotesStore: NotesStore = {
	loadTree: () => getValue<FileState>(NOTES_STORAGE_KEY),
	saveTree: (state) => setValue(NOTES_STORAGE_KEY, state),
	// Each save is one write; nothing is queued inside the store.
	flush: () => Promise.resolve(),
};

export const indexedDbBoardsStore: BoardsStore = {
	listBoards: boardsRepo.listBoards,
	getBoard: boardsRepo.getBoard,
	countBoards: boardsRepo.countBoards,
	createBoard: boardsRepo.createBoard,
	saveBoard: boardsRepo.saveBoard,
	renameBoard: boardsRepo.renameBoard,
	duplicateBoard: boardsRepo.duplicateBoard,
	deleteBoard: boardsRepo.deleteBoard,
	mergeBoards: boardsRepo.mergeBoards,
	getLastBoardId: boardsRepo.getLastBoardId,
	setLastBoardId: boardsRepo.setLastBoardId,
	saveBoardContent: boardsRepo.saveBoardContent,
};

/** Keys the two finance slices have always been saved under. Do not change them. */
export const FINANCE_STORAGE_KEY = "redux_finance_data";
export const EXPENSES_STORAGE_KEY = "redux_expenses_data";

export const indexedDbFinanceStore: FinanceStore = {
	loadFinance: () => getValue<FinanceState>(FINANCE_STORAGE_KEY),
	saveFinance: (state) => setValue(FINANCE_STORAGE_KEY, state),
	loadExpenses: () => getValue<ExpensesState>(EXPENSES_STORAGE_KEY),
	saveExpenses: (state) => setValue(EXPENSES_STORAGE_KEY, state),
};

export const indexedDbStorage: StorageProvider = {
	notes: indexedDbNotesStore,
	boards: indexedDbBoardsStore,
	journal: indexedDbJournalStore,
	activity: indexedDbActivityStore,
	finance: indexedDbFinanceStore,
	timeline: indexedDbTimelineStore,
};
