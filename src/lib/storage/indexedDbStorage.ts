import * as boardsRepo from "@src/lib/db/boardsRepo";
import { getValue, setValue } from "@src/lib/db/database";
import type { FileState } from "@src/features/markdown/type";
import type {
	BoardsStore,
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

export const indexedDbStorage: StorageProvider = {
	notes: indexedDbNotesStore,
	boards: indexedDbBoardsStore,
};
