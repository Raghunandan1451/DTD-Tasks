import type { DirEntry } from "@src/lib/desktop/types";
import type { NotesFs } from "@src/lib/storage/folder/notesIndex";

/**
 * A data folder held in memory: the same file API the desktop shell gives the
 * folder stores, with the files in a Map. The browser uses it to lay its data out
 * exactly like a desktop data folder (for the ZIP) and to read such a folder back.
 */
export interface MemoryFs extends NotesFs {
	/** Every file: path inside the folder -> text. */
	files: Map<string, string>;
}

const clean = (path: string): string =>
	path.split("\\").join("/").replace(/^\/+/, "").replace(/\/+$/, "");

export const createMemoryFs = (initial?: Iterable<[string, string]>): MemoryFs => {
	const files = new Map<string, string>();
	for (const [path, text] of initial ?? []) files.set(clean(path), text);

	const under = (dir: string) => (dir ? `${dir}/` : "");

	return {
		files,
		readText: async (rel) => files.get(clean(rel)) ?? null,
		writeText: async (rel, content) => {
			files.set(clean(rel), content);
		},
		// Binary files are not part of a data-folder ZIP; they are accepted and ignored.
		readBinary: async () => null,
		writeBinary: async () => {},
		list: async (rel) => {
			const prefix = under(clean(rel));
			const seen = new Map<string, DirEntry>();
			for (const [path, text] of files) {
				if (!path.startsWith(prefix)) continue;
				const rest = path.slice(prefix.length);
				const slash = rest.indexOf("/");
				const name = slash === -1 ? rest : rest.slice(0, slash);
				if (!name || seen.has(name)) continue;
				seen.set(name, {
					name,
					kind: slash === -1 ? "file" : "dir",
					size: slash === -1 ? text.length : 0,
					modifiedMs: 0,
				});
			}
			return [...seen.values()];
		},
		mkdir: async () => {},
		rename: async (from, to) => {
			const source = clean(from);
			const target = clean(to);
			for (const [path, text] of [...files]) {
				if (path === source || path.startsWith(`${source}/`)) {
					files.delete(path);
					files.set(target + path.slice(source.length), text);
				}
			}
		},
		trash: async (rel) => {
			const target = clean(rel);
			for (const path of [...files.keys()]) {
				if (path === target || path.startsWith(`${target}/`)) files.delete(path);
			}
		},
	};
};
