import type { File, Folder } from "@src/features/markdown/type";
import type { DesktopApi } from "@src/lib/desktop/types";
import { toDiskPath } from "@src/lib/storage/folder/fileNames";

export type NotesFs = DesktopApi["fs"];

export const INDEX_PATH = ".dtdtasks/notes-index.json";

/**
 * What the app remembers about each note and folder, keyed by its path in the
 * folder. `.md` files carry no id of their own (the content stays clean), so
 * this file is how a note keeps its identity between runs.
 */
export interface IndexEntry {
	id: string;
	kind: "file" | "folder";
	/** Content fingerprint, files only; used to tell a rename from a new note. */
	hash?: string;
}

export interface NotesIndex {
	version: 1;
	paths: Record<string, IndexEntry>;
}

export const emptyIndex = (): NotesIndex => ({ version: 1, paths: {} });

/** FNV-1a plus the length. Not a security hash; it only has to differ for different text. */
export const hashContent = (text: string): string => {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return `${(h >>> 0).toString(16)}:${text.length}`;
};

const isEntry = (value: unknown): value is IndexEntry => {
	if (typeof value !== "object" || value === null) return false;
	const entry = value as Record<string, unknown>;
	return (
		typeof entry.id === "string" &&
		(entry.kind === "file" || entry.kind === "folder") &&
		(entry.hash === undefined || typeof entry.hash === "string")
	);
};

/** A missing or damaged index is not an error: notes just get new ids. */
export const readIndex = async (fs: NotesFs): Promise<NotesIndex> => {
	try {
		const raw = await fs.readText(INDEX_PATH);
		if (!raw) return emptyIndex();
		const parsed = JSON.parse(raw) as { version?: unknown; paths?: unknown };
		if (parsed.version !== 1 || typeof parsed.paths !== "object" || !parsed.paths) {
			return emptyIndex();
		}
		const paths: Record<string, IndexEntry> = {};
		for (const [path, entry] of Object.entries(parsed.paths)) {
			if (isEntry(entry)) paths[path] = entry;
		}
		return { version: 1, paths };
	} catch {
		return emptyIndex();
	}
};

export const writeIndex = (fs: NotesFs, index: NotesIndex): Promise<void> =>
	fs.writeText(INDEX_PATH, JSON.stringify(index));

/** The index for a tree, using the names the notes have on disk. */
export const buildIndex = (files: (File | Folder)[]): NotesIndex => {
	const paths: Record<string, IndexEntry> = {};
	const walk = (items: (File | Folder)[], parent: string) => {
		for (const item of items) {
			const path = toDiskPath(parent ? `${parent}/${item.path}` : item.path);
			if (item.type === "folder") {
				paths[path] = { id: item.id, kind: "folder" };
				walk(item.children, path);
			} else {
				paths[path] = { id: item.id, kind: "file", hash: hashContent(item.content) };
			}
		}
	};
	walk(files, "");
	return { version: 1, paths };
};
