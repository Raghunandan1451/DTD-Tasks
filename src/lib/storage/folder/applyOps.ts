import {
	IGNORED_NOTES_FOLDERS,
	baseName,
	dirName,
	isNoteName,
	toDiskPath,
} from "@src/lib/storage/folder/fileNames";
import type { NotesFs } from "@src/lib/storage/folder/notesIndex";
import type { NotesOp } from "@src/lib/storage/notesDiff";

/** Thrown when a step cannot be done without overwriting something else. */
export class NotesDiskError extends Error {}

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Windows treats "Notes.md" and "notes.md" as one file, so a clash is checked case-blind. */
const assertFree = async (fs: NotesFs, path: string, allowSameAs?: string) => {
	if (dirName(path) === "" && IGNORED_NOTES_FOLDERS.some((n) => sameName(n, baseName(path)))) {
		throw new NotesDiskError(`"${baseName(path)}" is reserved for PDF copies`);
	}
	const entries = await fs.list(dirName(path));
	const clash = entries.find((e) => sameName(e.name, baseName(path)));
	if (!clash) return;
	if (allowSameAs && sameName(baseName(allowSameAs), clash.name) && dirName(allowSameAs) === dirName(path)) {
		return;
	}
	throw new NotesDiskError(`"${clash.name}" already exists in this folder`);
};

/** Trashes a folder's notes and subfolders, leaves anything else, and trashes the folder only if it ends up empty. */
const trashFolder = async (fs: NotesFs, path: string): Promise<void> => {
	for (const entry of await fs.list(path)) {
		const child = `${path}/${entry.name}`;
		if (entry.kind === "dir") await trashFolder(fs, child);
		else if (isNoteName(entry.name)) await fs.trash(child);
	}
	if ((await fs.list(path)).length === 0) await fs.trash(path);
};

/** Runs the steps from `diffNotesTree` against the folder, in order. */
export const applyOps = async (fs: NotesFs, ops: NotesOp[]): Promise<void> => {
	for (const op of ops) {
		switch (op.type) {
			case "create": {
				const path = toDiskPath(op.path);
				await assertFree(fs, path);
				if (op.kind === "folder") await fs.mkdir(path);
				else await fs.writeText(path, op.content ?? "");
				break;
			}
			case "write":
				await fs.writeText(toDiskPath(op.path), op.content);
				break;
			case "rename":
			case "move": {
				const from = toDiskPath(op.from);
				const to = toDiskPath(op.to);
				if (from === to) break;
				await assertFree(fs, to, from);
				await fs.rename(from, to);
				break;
			}
			case "remove": {
				const path = toDiskPath(op.path);
				if (op.kind === "folder") await trashFolder(fs, path);
				else await fs.trash(path);
				break;
			}
		}
	}
};
