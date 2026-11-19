import type { File, Folder } from "@src/features/markdown/type";
import { newId } from "@src/lib/db/newId";
import { UploadError } from "@src/lib/utils/uploadError";

export interface NotesMergeResult {
	files: (File | Folder)[];
	/** Notes added (including those added under a new name). */
	added: number;
	/** Notes added under a different name because that name was taken by other text. */
	renamed: number;
	/** Notes left out because the same name already held the same text. */
	skipped: number;
}

type Tree = (File | Folder)[];

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const cleanName = (name: string): string => name.replace(/[/\\]/g, "_").trim();

/** Checks a notes backup (`{ files: [...] }`) and returns its tree, names cleaned and `.md` added to notes. */
export const parseNotesBackup = (raw: unknown): Tree => {
	if (!isRecord(raw) || !Array.isArray(raw.files)) {
		throw new UploadError("This doesn't look like a Notes backup file");
	}
	const visit = (items: unknown[], where: string): Tree =>
		items.map((item, index) => {
			if (!isRecord(item) || typeof item.path !== "string" || !cleanName(item.path)) {
				throw new UploadError(`Notes backup has an invalid item (${where} #${index + 1})`);
			}
			const name = cleanName(item.path);
			if (item.type === "folder") {
				if (!Array.isArray(item.children)) {
					throw new UploadError(`Folder "${name}" in the Notes backup has no list of items`);
				}
				return { id: newId(), path: name, type: "folder", children: visit(item.children, name) };
			}
			if (item.type === "file" && typeof item.content === "string") {
				return {
					id: newId(),
					path: /\.md$/i.test(name) ? name : `${name}.md`,
					type: "file",
					content: item.content,
				};
			}
			throw new UploadError(`"${name}" in the Notes backup is not a note or a folder`);
		});
	return visit(raw.files, "top level");
};

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** "idea.md", 2 -> "idea (2).md"; "docs", 2 -> "docs (2)". */
const numbered = (name: string, n: number): string => {
	const dot = name.toLowerCase().endsWith(".md") ? name.length - 3 : name.length;
	return `${name.slice(0, dot)} (${n})${name.slice(dot)}`;
};

const free = (siblings: Tree, name: string): string => {
	let candidate = name;
	for (let n = 2; siblings.some((s) => sameName(s.path, candidate)); n++) {
		candidate = numbered(name, n);
	}
	return candidate;
};

/**
 * Adds an imported notes tree to the existing one. Nothing existing is changed
 * or overwritten: a folder with the same name is merged into, a note with the
 * same name and the same text is skipped, a note with the same name and other
 * text is added as "name (2).md". Imported items get new ids.
 */
export const mergeImportedNotes = (existing: Tree, incoming: Tree): NotesMergeResult => {
	const result = { added: 0, renamed: 0, skipped: 0 };

	const merge = (current: Tree, extra: Tree): Tree => {
		const next: Tree = [...current];
		for (const item of extra) {
			const match = next.findIndex((n) => sameName(n.path, item.path));
			if (item.type === "folder") {
				const found = match === -1 ? undefined : next[match];
				if (found?.type === "folder") {
					next[match] = { ...found, children: merge(found.children, item.children) };
				} else {
					const name = free(next, item.path);
					if (name !== item.path) result.renamed++;
					next.push({ ...item, path: name, children: merge([], item.children) });
				}
				continue;
			}
			const found = match === -1 ? undefined : next[match];
			if (found?.type === "file" && found.content === item.content) {
				result.skipped++;
				continue;
			}
			const name = free(next, item.path);
			if (name !== item.path) result.renamed++;
			next.push({ ...item, path: name });
			result.added++;
		}
		return next;
	};

	return { files: merge(existing, incoming), ...result };
};
