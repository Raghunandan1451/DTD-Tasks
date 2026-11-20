import type { DirEntry } from "@src/lib/desktop/types";
import type { NotesFs } from "@src/lib/storage/folder/notesIndex";

/** A folder in memory: path -> text, plus a set of directories. */
export const fakeFs = (initial: Record<string, string> = {}) => {
	const files = new Map<string, string>(Object.entries(initial));
	const dirs = new Set<string>();
	const trashed: string[] = [];
	const parents = (p: string) => {
		const parts = p.split("/");
		for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join("/"));
	};
	for (const p of files.keys()) parents(p);
	const under = (rel: string, p: string) =>
		rel === "" ? !p.includes("/") : p.startsWith(`${rel}/`) && !p.slice(rel.length + 1).includes("/");
	const write = async (p: string, c: string) => {
		parents(p);
		files.set(p, c);
	};
	const fs: NotesFs = {
		readText: async (p) => files.get(p) ?? null,
		writeText: write,
		writeBinary: write,
		readBinary: async (p) => files.get(p) ?? null,
		list: async (rel) => {
			const out: DirEntry[] = [];
			for (const p of files.keys())
				if (under(rel, p) && !(rel === "" && p.startsWith(".dtdtasks")))
					out.push({ name: p.split("/").pop()!, kind: "file", size: 0, modifiedMs: 0 });
			for (const d of dirs)
				if (under(rel, d) && d !== ".dtdtasks")
					out.push({ name: d.split("/").pop()!, kind: "dir", size: 0, modifiedMs: 0 });
			return out;
		},
		mkdir: async (p) => {
			dirs.add(p);
			parents(p);
		},
		rename: async (from, to) => {
			for (const [p, c] of [...files]) {
				if (p === from || p.startsWith(`${from}/`)) {
					files.delete(p);
					files.set(to + p.slice(from.length), c);
				}
			}
			for (const d of [...dirs]) {
				if (d === from || d.startsWith(`${from}/`)) {
					dirs.delete(d);
					dirs.add(to + d.slice(from.length));
				}
			}
			parents(to);
		},
		trash: async (p) => {
			trashed.push(p);
			files.delete(p);
			dirs.delete(p);
		},
	};
	return { fs, files, dirs, trashed };
};
