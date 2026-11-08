import { nanoid } from "@reduxjs/toolkit";
import type { File, Folder } from "@src/features/markdown/type";

/**
 * Returns the tree with a stable `id` on every file and folder, keeping ids
 * that already exist. Data saved or exported before ids were introduced gets
 * them on its first load.
 */
export const ensureIds = (items: (File | Folder)[]): (File | Folder)[] =>
	items.map((item) => {
		const id = typeof item.id === "string" && item.id ? item.id : nanoid();
		return item.type === "folder"
			? { ...item, id, children: ensureIds(item.children) }
			: { ...item, id };
	});

/** Ids of every file and folder currently in the tree. */
export const collectItemIds = (items: (File | Folder)[]): Set<string> => {
	const ids = new Set<string>();
	const visit = (list: (File | Folder)[]) => {
		for (const item of list) {
			ids.add(item.id);
			if (item.type === "folder") visit(item.children);
		}
	};
	visit(items);
	return ids;
};

/** Current full path (e.g. "Notes/Idea.md") of the item with this id, or null if it is gone. */
export const findPathById = (
	items: (File | Folder)[],
	id: string,
	parent = "",
): string | null => {
	for (const item of items) {
		const fullPath = parent ? `${parent}/${item.path}` : item.path;
		if (item.id === id) return fullPath;
		if (item.type === "folder") {
			const found = findPathById(item.children, id, fullPath);
			if (found) return found;
		}
	}
	return null;
};
