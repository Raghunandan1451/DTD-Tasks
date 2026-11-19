import { indexedDbStorage } from "@src/lib/storage/indexedDbStorage";
import type {
	BoardsStore,
	FinanceStore,
	NotesStore,
	StorageProvider,
} from "@src/lib/storage/types";

export type {
	ActivityStore,
	BoardContent,
	FinanceStore,
	JournalStore,
	TimelineStore,
	BoardMergeResult,
	BoardsStore,
	NotesStore,
	StorageProvider,
} from "@src/lib/storage/types";

/**
 * The one place the app asks "where is my data kept?". The browser build uses
 * IndexedDB. The desktop build will call `setStorage` once at startup (before
 * the app renders) to switch to the chosen folder; tests call it with a memory
 * store. Nothing else in the app should talk to a database for notes or boards.
 */
let provider: StorageProvider = indexedDbStorage;

export const getStorage = (): StorageProvider => provider;

/** Replaces the parts given; anything left out keeps its current store. */
export const setStorage = (next: Partial<StorageProvider>): void => {
	provider = { ...provider, ...next };
};

/** Back to the default IndexedDB storage (tests). */
export const resetStorage = (): void => {
	provider = indexedDbStorage;
};

export const getNotesStore = (): NotesStore => provider.notes;
export const getFinanceStore = (): FinanceStore => provider.finance;

// Board functions under their original names, always using the active store.
const boards = (): BoardsStore => provider.boards;

export const listBoards: BoardsStore["listBoards"] = () => boards().listBoards();
export const getBoard: BoardsStore["getBoard"] = (id) => boards().getBoard(id);
export const countBoards: BoardsStore["countBoards"] = () => boards().countBoards();
export const createBoard: BoardsStore["createBoard"] = (...args) =>
	boards().createBoard(...args);
export const saveBoard: BoardsStore["saveBoard"] = (board) => boards().saveBoard(board);
export const renameBoard: BoardsStore["renameBoard"] = (id, name) =>
	boards().renameBoard(id, name);
export const duplicateBoard: BoardsStore["duplicateBoard"] = (id) =>
	boards().duplicateBoard(id);
export const deleteBoard: BoardsStore["deleteBoard"] = (id) => boards().deleteBoard(id);
export const mergeBoards: BoardsStore["mergeBoards"] = (list) => boards().mergeBoards(list);
export const getLastBoardId: BoardsStore["getLastBoardId"] = () => boards().getLastBoardId();
export const setLastBoardId: BoardsStore["setLastBoardId"] = (id) =>
	boards().setLastBoardId(id);
export const saveBoardContent: BoardsStore["saveBoardContent"] = (id, content, options) =>
	boards().saveBoardContent(id, content, options);
