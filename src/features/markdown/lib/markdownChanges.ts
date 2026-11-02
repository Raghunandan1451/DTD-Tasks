import type { File, Folder } from "@src/features/markdown/type";
import type { MarkdownAction, MarkdownLogEntry } from "@src/lib/db/types";

interface FlatItem {
	id: string;
	/** This item's own name, without its parent folders. */
	path: string;
	/** Full path from the root, e.g. "Notes/Idea.md". */
	fullPath: string;
	isFolder: boolean;
	content?: string;
}

export interface MarkdownChange {
	fileId: string;
	/** Full path at the time of the change. */
	name: string;
	action: MarkdownAction;
	meta?: MarkdownLogEntry["meta"];
}

const flatten = (
	items: (File | Folder)[],
	parent: string,
	into: Map<string, FlatItem>,
): Map<string, FlatItem> => {
	for (const item of items) {
		const fullPath = parent ? `${parent}/${item.path}` : item.path;
		into.set(item.id, {
			id: item.id,
			path: item.path,
			fullPath,
			isFolder: item.type === "folder",
			content: item.type === "file" ? item.content : undefined,
		});
		if (item.type === "folder") flatten(item.children, fullPath, into);
	}
	return into;
};

const folderMeta = (item: FlatItem) =>
	item.isFolder ? { isFolder: true } : undefined;

/**
 * What changed between two persisted trees, matched by stable id.
 * - created / deleted: an id only in one tree (every removed descendant of a
 *   deleted folder is reported too, using the name it had before);
 * - renamed: the item's own name changed (its descendants are not reported);
 * - edited: a file's content changed.
 */
export const diffMarkdownTrees = (
	previous: (File | Folder)[],
	next: (File | Folder)[],
): MarkdownChange[] => {
	const before = flatten(previous, "", new Map());
	const after = flatten(next, "", new Map());
	const changes: MarkdownChange[] = [];

	for (const item of after.values()) {
		const old = before.get(item.id);
		if (!old) {
			changes.push({
				fileId: item.id,
				name: item.fullPath,
				action: "created",
				meta: folderMeta(item),
			});
			continue;
		}
		if (old.path !== item.path) {
			changes.push({
				fileId: item.id,
				name: item.fullPath,
				action: "renamed",
				meta: { oldName: old.fullPath, ...(item.isFolder ? { isFolder: true } : {}) },
			});
		}
		if (!item.isFolder && old.content !== item.content) {
			changes.push({ fileId: item.id, name: item.fullPath, action: "edited" });
		}
	}

	for (const old of before.values()) {
		if (!after.has(old.id)) {
			changes.push({
				fileId: old.id,
				name: old.fullPath,
				action: "deleted",
				meta: folderMeta(old),
			});
		}
	}

	return changes;
};
