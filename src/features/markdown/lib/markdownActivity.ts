import type { File, Folder } from "@src/features/markdown/type";
import { diffMarkdownTrees } from "@src/features/markdown/lib/markdownChanges";
import { logMarkdown } from "@src/lib/db/markdownLogRepo";

type Tree = (File | Folder)[];

/** The tree as of the last save (or hydrate/import). Null until known. */
let baseline: Tree | null = null;

const treeOf = (state: unknown): Tree | null => {
	if (typeof state !== "object" || state === null || !("files" in state)) {
		return null;
	}
	return Array.isArray(state.files) ? (state.files as Tree) : null;
};

/**
 * Hydrate and import replace the whole tree: that is loading data, not user
 * activity, so it only moves the baseline.
 */
export const resetMarkdownBaseline = (state: unknown): void => {
	baseline = treeOf(state);
};

/** Remembers the pre-action tree if nothing has set a baseline yet. */
export const ensureMarkdownBaseline = (state: unknown): void => {
	if (baseline === null) baseline = treeOf(state);
};

/**
 * Called after the tree was written to IndexedDB. Logs what changed since the
 * previous save; on any failure it gives up quietly and keeps the old baseline
 * so the next save reports the accumulated difference.
 */
export const logPersistedMarkdown = async (state: unknown): Promise<void> => {
	try {
		const next = treeOf(state);
		if (!next) return;
		if (baseline === null) {
			baseline = next;
			return;
		}
		const changes = diffMarkdownTrees(baseline, next);
		baseline = next;
		for (const change of changes) {
			await logMarkdown(change.fileId, change.name, change.action, change.meta);
		}
	} catch (error) {
		console.warn("[markdownLog] Could not record activity", error);
	}
};

/** Test helper. */
export const clearMarkdownBaselineForTests = (): void => {
	baseline = null;
};
