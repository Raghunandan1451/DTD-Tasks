import type { File, FileState, Folder } from "@src/features/markdown/type";
import { applyOps } from "@src/lib/storage/folder/applyOps";
import { NOTES_ROOT, baseName, dirName } from "@src/lib/storage/folder/fileNames";
import {
	type NotesFs,
	buildIndex,
	readIndex,
	writeIndex,
} from "@src/lib/storage/folder/notesIndex";
import { scanNotes } from "@src/lib/storage/folder/scanNotes";
import { scopedFs } from "@src/lib/storage/folder/scopedFs";
import { diffNotesTree } from "@src/lib/storage/notesDiff";
import type { NotesRefresh, NotesStore } from "@src/lib/storage/types";

type Tree = (File | Folder)[];

/** id -> full path and text for every note. */
const notesById = (items: Tree, parent = "", into = new Map<string, { path: string; content: string }>()) => {
	for (const item of items) {
		const path = parent ? `${parent}/${item.path}` : item.path;
		if (item.type === "folder") notesById(item.children, path, into);
		else into.set(item.id, { path, content: item.content });
	}
	return into;
};

const stamp = (date: Date) =>
	date.toISOString().slice(0, 19).replace("T", " ").replace(/:/g, "-");

const conflictName = (path: string, date: Date) => {
	const name = baseName(path).replace(/\.md$/i, "");
	const copy = `${name} (conflict ${stamp(date)}).md`;
	const dir = dirName(path);
	return dir ? `${dir}/${copy}` : copy;
};

/**
 * Notes kept as `.md` files in the data folder's own Notes folder. The app holds
 * the whole tree in Redux; each save diffs it against what is on disk and runs
 * only the steps that differ. Saves run one at a time so steps never interleave.
 *
 * `fs` is the data folder; the store only touches `<fs>/<root>/...` plus its own
 * index in `.dtdtasks/`.
 */
export const createFolderNotesStore = (
	fs: NotesFs,
	root: string = NOTES_ROOT,
): NotesStore => {
	const notesFs = scopedFs(fs, root);
	let onDisk: Tree = [];
	/** Until the first load there is no baseline to compare against. */
	let loadedOnce = false;
	let queue: Promise<unknown> = Promise.resolve();

	const loadTree = async (): Promise<FileState | null> => {
		await fs.mkdir(root);
		const files = await scanNotes(notesFs, await readIndex(fs));
		onDisk = structuredClone(files);
		loadedOnce = true;
		await writeIndex(fs, buildIndex(files));
		if (files.length === 0) return null;
		return { files, selectedFile: null, content: "", loaded: true };
	};

	const save = async (state: FileState): Promise<void> => {
		const ops = diffNotesTree(onDisk, state.files);
		if (ops.length === 0) return;
		try {
			await applyOps(notesFs, ops);
		} catch (error) {
			// Some steps may have run. Re-read the folder so the next save starts from the truth.
			try {
				onDisk = await scanNotes(notesFs, await readIndex(fs));
			} catch {
				/* keep the old baseline */
			}
			throw error;
		}
		onDisk = structuredClone(state.files);
		await writeIndex(fs, buildIndex(onDisk));
	};

	/**
	 * Reads the folder again. When nothing changed outside the app this is null.
	 * A note changed on disk replaces the app's copy. If the app also had unsaved
	 * edits to it, those edits are kept in a "(conflict <time>)" copy next to it,
	 * so nothing the user typed is thrown away and nothing newer on disk is overwritten.
	 */
	const refresh = async (current: FileState): Promise<NotesRefresh | null> => {
		if (!loadedOnce) return null;
		const index = await readIndex(fs);
		let scanned = await scanNotes(notesFs, index);
		if (diffNotesTree(onDisk, scanned).length === 0) return null;

		const base = notesById(onDisk);
		const app = notesById(current.files);
		const disk = notesById(scanned);
		const conflicts: string[] = [];
		const now = new Date();
		for (const [id, theirs] of disk) {
			const before = base.get(id);
			const mine = app.get(id);
			if (!before || !mine) continue;
			if (theirs.content === before.content) continue; // disk did not change this note
			if (mine.content === before.content || mine.content === theirs.content) continue; // app did not change it, or same edit
			const copy = conflictName(theirs.path, now);
			await notesFs.writeText(copy, mine.content);
			conflicts.push(copy);
		}
		if (conflicts.length > 0) scanned = await scanNotes(notesFs, index);

		onDisk = structuredClone(scanned);
		await writeIndex(fs, buildIndex(scanned));
		const selected = current.selectedFile;
		const keep = selected && [...notesById(scanned).values()].find((n) => n.path === selected);
		return {
			state: {
				files: scanned,
				selectedFile: keep ? selected : null,
				content: keep ? keep.content : "",
				loaded: true,
			},
			conflicts,
		};
	};

	const enqueue = <T>(job: () => Promise<T>): Promise<T> => {
		const run = queue.then(job, job);
		queue = run.catch(() => undefined);
		return run;
	};

	return {
		loadTree: () => enqueue(loadTree),
		saveTree: (state) => enqueue(() => save(state)),
		flush: () => enqueue(async () => {}),
		refresh: (current) => enqueue(() => refresh(current)),
	};
};
