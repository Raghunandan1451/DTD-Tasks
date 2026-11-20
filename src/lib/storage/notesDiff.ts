import type { File, Folder } from "@src/features/markdown/type";

type Kind = "file" | "folder";

/**
 * One file-system step. Paths are full paths from the notes root
 * ("docs/readme.md") as they are at the moment the step runs, so applying the
 * steps in order always works on paths that exist.
 */
export type NotesOp =
	| { type: "create"; id: string; kind: Kind; path: string; content?: string }
	| { type: "write"; id: string; path: string; content: string }
	| { type: "rename"; id: string; kind: Kind; from: string; to: string }
	| { type: "move"; id: string; kind: Kind; from: string; to: string }
	| { type: "remove"; id: string; kind: Kind; path: string };

interface Node {
	id: string;
	name: string;
	parentId: string | null;
	kind: Kind;
	content: string;
}

const flatten = (
	items: (File | Folder)[],
	parentId: string | null,
	into: Map<string, Node>,
): Map<string, Node> => {
	for (const item of items) {
		into.set(item.id, {
			id: item.id,
			name: item.path,
			parentId,
			kind: item.type,
			content: item.type === "file" ? item.content : "",
		});
		if (item.type === "folder") flatten(item.children, item.id, into);
	}
	return into;
};

const siblingKey = (parentId: string | null, name: string) =>
	`${parentId ?? ""}\u0000${name}`;

type Pending =
	| { type: "create"; node: Node }
	| { type: "relocate"; node: Node }
	| { type: "remove"; node: Node }
	| { type: "write"; node: Node };

/**
 * Turns "the tree we last saved" and "the tree now" into the ordered steps that
 * make a folder on disk match. Items are matched by their stable id, so a
 * rename or move is never mistaken for a delete plus a create.
 *
 * - A renamed or moved folder is one step: its contents are not repeated.
 * - A removed folder is one step: its contents are not repeated.
 * - A step only runs when it can: a folder is created before what goes into it,
 *   an item is moved out of a folder before that folder is removed, and a name
 *   freed by a rename can be reused by a create in the same batch.
 * - Several changes landing at once can in theory be impossible to order (two
 *   items swapping names). Those steps are still emitted, last, in a best-effort
 *   order; a store whose step fails should rescan and rewrite from the tree.
 */
export const diffNotesTree = (
	previous: (File | Folder)[],
	next: (File | Folder)[],
): NotesOp[] => {
	const before = flatten(previous, null, new Map());
	const after = flatten(next, null, new Map());

	const removed = new Set<string>();
	for (const id of before.keys()) if (!after.has(id)) removed.add(id);

	const depthIn = (tree: Map<string, Node>, id: string): number => {
		let depth = 0;
		for (let n = tree.get(id); n?.parentId; n = tree.get(n.parentId)) depth++;
		return depth;
	};

	const creates: Pending[] = [];
	const relocates: Pending[] = [];
	const writes: Pending[] = [];
	for (const node of after.values()) {
		const old = before.get(node.id);
		if (!old) {
			creates.push({ type: "create", node });
			continue;
		}
		if (old.parentId !== node.parentId || old.name !== node.name) {
			relocates.push({ type: "relocate", node });
		}
		if (node.kind === "file" && old.content !== node.content) {
			writes.push({ type: "write", node });
		}
	}
	// Only the top of a removed subtree needs a step.
	const removes: Pending[] = [];
	for (const id of removed) {
		const node = before.get(id)!;
		if (node.parentId === null || !removed.has(node.parentId)) {
			removes.push({ type: "remove", node });
		}
	}

	const byDepth =
		(tree: Map<string, Node>, direction: 1 | -1) => (a: Pending, b: Pending) =>
			direction * (depthIn(tree, a.node.id) - depthIn(tree, b.node.id));
	const folderCreates = creates
		.filter((p) => p.node.kind === "folder")
		.sort(byDepth(after, 1));
	const fileCreates = creates
		.filter((p) => p.node.kind === "file")
		.sort(byDepth(after, 1));
	const pending: Pending[] = [
		...folderCreates,
		...relocates.sort(byDepth(before, 1)),
		...fileCreates,
		...removes.sort(byDepth(before, -1)),
		...writes,
	];

	// The tree as the disk would look after the steps emitted so far.
	const current = new Map<string, Node>();
	for (const node of before.values()) current.set(node.id, { ...node });
	const occupied = new Map<string, string>();
	const children = new Map<string, Set<string>>();
	const link = (node: Node) => {
		occupied.set(siblingKey(node.parentId, node.name), node.id);
		if (node.parentId) {
			if (!children.has(node.parentId)) children.set(node.parentId, new Set());
			children.get(node.parentId)!.add(node.id);
		}
	};
	const unlink = (node: Node) => {
		occupied.delete(siblingKey(node.parentId, node.name));
		if (node.parentId) children.get(node.parentId)?.delete(node.id);
	};
	for (const node of current.values()) link(node);

	// A best-effort step (see above) could in theory leave a loop in `current`;
	// the cap keeps the walks finite instead of hanging.
	const MAX_DEPTH = 1000;

	const pathOf = (id: string): string => {
		const parts: string[] = [];
		let n = current.get(id);
		for (let i = 0; n && i < MAX_DEPTH; i++) {
			parts.push(n.name);
			n = n.parentId ? current.get(n.parentId) : undefined;
		}
		return parts.reverse().join("/");
	};

	const isInside = (id: string, ancestorId: string): boolean => {
		let n = current.get(id);
		for (let i = 0; n && i < MAX_DEPTH; i++) {
			if (n.id === ancestorId) return true;
			n = n.parentId ? current.get(n.parentId) : undefined;
		}
		return false;
	};

	const parentReady = (parentId: string | null) =>
		parentId === null || current.has(parentId);

	const isReady = (p: Pending): boolean => {
		const { node } = p;
		if (p.type === "create") {
			return (
				parentReady(node.parentId) &&
				!occupied.has(siblingKey(node.parentId, node.name))
			);
		}
		if (p.type === "relocate") {
			const holder = occupied.get(siblingKey(node.parentId, node.name));
			return (
				parentReady(node.parentId) &&
				(holder === undefined || holder === node.id) &&
				!(node.parentId && isInside(node.parentId, node.id))
			);
		}
		if (p.type === "remove") {
			for (const childId of children.get(node.id) ?? []) {
				if (!removed.has(childId)) return false;
			}
			return true;
		}
		// write: only once the file exists where it will finally live.
		return current.has(node.id);
	};

	const ops: NotesOp[] = [];
	const apply = (p: Pending) => {
		const { node } = p;
		if (p.type === "create") {
			current.set(node.id, { ...node });
			link(node);
			ops.push({
				type: "create",
				id: node.id,
				kind: node.kind,
				path: pathOf(node.id),
				...(node.kind === "file" ? { content: node.content } : {}),
			});
		} else if (p.type === "relocate") {
			const existing = current.get(node.id)!;
			const from = pathOf(node.id);
			const sameParent = existing.parentId === node.parentId;
			unlink(existing);
			existing.parentId = node.parentId;
			existing.name = node.name;
			link(existing);
			ops.push({
				type: sameParent ? "rename" : "move",
				id: node.id,
				kind: node.kind,
				from,
				to: pathOf(node.id),
			});
		} else if (p.type === "remove") {
			const path = pathOf(node.id);
			const gone = current.get(node.id)!;
			unlink(gone);
			current.delete(node.id);
			ops.push({ type: "remove", id: node.id, kind: node.kind, path });
		} else {
			ops.push({
				type: "write",
				id: node.id,
				path: pathOf(node.id),
				content: node.content,
			});
		}
	};

	let waiting = pending;
	while (waiting.length > 0) {
		const stillWaiting: Pending[] = [];
		let progressed = false;
		for (const p of waiting) {
			if (isReady(p)) {
				apply(p);
				progressed = true;
			} else {
				stillWaiting.push(p);
			}
		}
		if (!progressed) {
			// Cannot be ordered safely: emit the rest as they are.
			for (const p of stillWaiting) {
				if (p.type === "remove" && !current.has(p.node.id)) continue;
				if (p.type === "write" && !current.has(p.node.id)) continue;
				apply(p);
			}
			break;
		}
		waiting = stillWaiting;
	}

	return ops;
};
