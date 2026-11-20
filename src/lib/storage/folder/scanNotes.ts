import type { File, Folder } from "@src/features/markdown/type";
import { newId } from "@src/lib/db/newId";
import {
	IGNORED_NOTES_FOLDERS,
	isHiddenName,
	isNoteName,
} from "@src/lib/storage/folder/fileNames";
import {
	type IndexEntry,
	type NotesFs,
	type NotesIndex,
	hashContent,
	readIndex,
} from "@src/lib/storage/folder/notesIndex";

interface DiskFile {
	path: string;
	name: string;
	content: string;
	hash: string;
}

interface DiskDir {
	path: string;
	name: string;
	files: DiskFile[];
	dirs: DiskDir[];
}

const join = (parent: string, name: string) => (parent ? `${parent}/${name}` : name);

const readDir = async (fs: NotesFs, path: string): Promise<DiskDir> => {
	const dir: DiskDir = { path, name: path.split("/").pop() ?? "", files: [], dirs: [] };
	const entries = await fs.list(path);
	entries.sort((a, b) => a.name.localeCompare(b.name));
	for (const entry of entries) {
		if (isHiddenName(entry.name)) continue;
		const child = join(path, entry.name);
		if (entry.kind === "dir") {
			if (path === "" && IGNORED_NOTES_FOLDERS.includes(entry.name)) continue;
			dir.dirs.push(await readDir(fs, child));
		} else if (isNoteName(entry.name)) {
			const content = (await fs.readText(child)) ?? "";
			dir.files.push({ path: child, name: entry.name, content, hash: hashContent(content) });
		}
	}
	return dir;
};

const allFiles = (dir: DiskDir): DiskFile[] => [
	...dir.files,
	...dir.dirs.flatMap(allFiles),
];

/**
 * Reads the notes folder into a tree. Only `.md` files are notes. Hidden
 * entries, the app's own folders, and other file types are left alone. A folder
 * shows up when it holds a note, or when the index says it was a folder the app
 * made (so an empty folder created in the app survives a restart).
 *
 * Ids come from the index. A note whose path is gone but whose text matches a
 * missing indexed note keeps that note's id, which covers renames and moves done
 * in the file explorer.
 */
export const scanNotes = async (
	fs: NotesFs,
	knownIndex?: NotesIndex,
): Promise<(File | Folder)[]> => {
	const index = knownIndex ?? (await readIndex(fs));
	const root = await readDir(fs, "");
	const files = allFiles(root);
	const onDisk = new Set(files.map((f) => f.path));

	// Indexed notes that vanished, by content, for rename detection.
	const missing = new Map<string, string[]>();
	for (const [path, entry] of Object.entries(index.paths)) {
		if (entry.kind !== "file" || !entry.hash || onDisk.has(path)) continue;
		const ids = missing.get(entry.hash) ?? [];
		ids.push(entry.id);
		missing.set(entry.hash, ids);
	}

	const used = new Set<string>();
	const claim = (id: string | undefined): string => {
		if (id && !used.has(id)) {
			used.add(id);
			return id;
		}
		const fresh = newId();
		used.add(fresh);
		return fresh;
	};

	const fileId = (file: DiskFile): string => {
		const known: IndexEntry | undefined = index.paths[file.path];
		if (known?.kind === "file") return claim(known.id);
		const moved = missing.get(file.hash)?.shift();
		return claim(moved);
	};

	const build = (dir: DiskDir): (File | Folder)[] => {
		const items: (File | Folder)[] = [];
		for (const sub of dir.dirs) {
			const children = build(sub);
			const known = index.paths[sub.path];
			if (children.length === 0 && known?.kind !== "folder") continue;
			items.push({
				id: claim(known?.kind === "folder" ? known.id : undefined),
				path: sub.name,
				type: "folder",
				children,
			});
		}
		for (const file of dir.files) {
			items.push({
				id: fileId(file),
				path: file.name,
				type: "file",
				content: file.content,
			});
		}
		return items;
	};

	return build(root);
};
