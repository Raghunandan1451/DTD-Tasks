import { newId as defaultNewId } from "@src/lib/db/newId";
import { BOARD_TEXT_MAX, type BoardEdge, type BoardNode } from "@src/lib/db/types";
import { DEFAULT_NODE_SIZE } from "@src/features/nodes/lib/constants";
import { layoutGrid } from "@src/features/nodes/lib/layout/grid";
import { DEFAULT_GAP_X, DEFAULT_GAP_Y } from "@src/features/nodes/lib/layout/types";
import { DEFAULT_BOARD_COLOR } from "@src/features/nodes/lib/palette";

/*
 * Outline format, one line per node:   Label -> Target1, Target2
 *
 * Rules (also covered by tests):
 *  - Labels are trimmed and case-sensitive. Blank lines are ignored.
 *  - A line without "->" (or with nothing after it) is a node with no links.
 *  - A label may be defined on only one line. A second definition is an error,
 *    because merging silently would hide typos. Referencing a label as a target
 *    on any number of lines is fine.
 *  - A target that has no line of its own is created as a new node.
 *  - A self-link (A -> A) is dropped with a warning: loops do not render well.
 *  - A repeated target on one line is collapsed, with a warning.
 *  - "->" and "," cannot appear inside a label.
 *
 * Ids stay stable: a label that already exists keeps its node (and position,
 * colour, size, text). A renamed label keeps the node that sat at the same
 * place in the node order. An edge between the same two nodes keeps its id,
 * label and arrow.
 */

export interface OutlineIssue {
	/** 1-based line in the outline text. */
	line: number;
	message: string;
}

export interface OutlineGraph {
	nodes: BoardNode[];
	edges: BoardEdge[];
}

export interface OutlineResult {
	/** Null whenever there are errors: nothing should be applied. */
	graph: OutlineGraph | null;
	errors: OutlineIssue[];
	warnings: OutlineIssue[];
}

const ARROW = "->";
const MAX_LABEL = 200;

/** The text a node shows as its name: a note's title, otherwise its text. */
export const labelOf = (node: BoardNode): string => {
	const raw = node.type === "note" ? node.data.title : node.data.text;
	return (raw ?? "").split("\n")[0].trim();
};

const withLabel = (node: BoardNode, label: string): BoardNode => {
	if (labelOf(node) === label) return node;
	return {
		...node,
		data: node.type === "note" ? { ...node.data, title: label } : { ...node.data, text: label },
	};
};

const cleanLabel = (label: string): string => label.split(ARROW).join("→").split(",").join(";");

/** Renders a board as outline text, one line per node, in node order. */
export const serializeOutline = (
	nodes: readonly BoardNode[],
	edges: readonly BoardEdge[],
): string => {
	const used = new Set<string>();
	const labels = nodes.map((node, index) => {
		let label = cleanLabel(labelOf(node)) || `Untitled ${index + 1}`;
		// Labels identify nodes in the outline, so duplicates get a suffix.
		const base = label;
		for (let n = 2; used.has(label); n++) label = `${base} (${n})`;
		used.add(label);
		return label;
	});
	const byId = new Map(nodes.map((node, i) => [node.id, labels[i]]));
	const targets = new Map<string, string[]>();
	for (const edge of edges) {
		const from = byId.get(edge.source);
		const to = byId.get(edge.target);
		if (!from || !to || from === to) continue;
		const list = targets.get(edge.source) ?? [];
		if (!list.includes(to)) list.push(to);
		targets.set(edge.source, list);
	}
	return nodes
		.map((node, i) => {
			const list = targets.get(node.id);
			return list?.length ? `${labels[i]} ${ARROW} ${list.join(", ")}` : labels[i];
		})
		.join("\n");
};

interface ParsedLine {
	line: number;
	label: string;
	targets: string[];
}

export const parseOutline = (
	text: string,
	existing: OutlineGraph,
	makeId: () => string = defaultNewId,
): OutlineResult => {
	const errors: OutlineIssue[] = [];
	const warnings: OutlineIssue[] = [];
	const parsed: ParsedLine[] = [];
	const definedAt = new Map<string, number>();

	text.split(/\r?\n/).forEach((raw, index) => {
		const line = index + 1;
		if (!raw.trim()) return;
		const at = raw.indexOf(ARROW);
		const label = (at === -1 ? raw : raw.slice(0, at)).trim();
		const rest = at === -1 ? "" : raw.slice(at + ARROW.length);

		if (!label) {
			errors.push({ line, message: "Missing a label before ->" });
			return;
		}
		if (label.length > MAX_LABEL || label.length > BOARD_TEXT_MAX) {
			errors.push({
				line,
				message: `Label is longer than ${MAX_LABEL} characters`,
			});
			return;
		}
		if (rest.includes(ARROW)) {
			errors.push({ line, message: 'Only one "->" is allowed per line' });
			return;
		}
		const first = definedAt.get(label);
		if (first !== undefined) {
			errors.push({
				line,
				message: `"${label}" is already defined on line ${first}`,
			});
			return;
		}
		definedAt.set(label, line);

		const targets: string[] = [];
		const pieces = rest.trim() === "" ? [] : rest.split(",");
		let bad = false;
		for (const piece of pieces) {
			const target = piece.trim();
			if (!target) {
				errors.push({
					line,
					message: "Empty target (check for a stray comma)",
				});
				bad = true;
				break;
			}
			if (target.length > MAX_LABEL) {
				errors.push({
					line,
					message: `Target is longer than ${MAX_LABEL} characters`,
				});
				bad = true;
				break;
			}
			if (target === label) {
				warnings.push({ line, message: `Self-link on "${label}" was ignored` });
			} else if (targets.includes(target)) {
				warnings.push({
					line,
					message: `"${target}" is listed twice and was merged`,
				});
			} else {
				targets.push(target);
			}
		}
		if (!bad) parsed.push({ line, label, targets });
	});

	if (errors.length > 0) return { graph: null, errors, warnings };

	// Labels in first-appearance order: definitions and targets interleaved as written.
	const order: string[] = [];
	const seen = new Set<string>();
	const note = (label: string) => {
		if (!seen.has(label)) {
			seen.add(label);
			order.push(label);
		}
	};
	for (const entry of parsed) {
		note(entry.label);
		entry.targets.forEach(note);
	}

	// Pass 1: same label keeps its node.
	const existingByLabel = new Map<string, BoardNode>();
	for (const node of existing.nodes) {
		const label = labelOf(node);
		if (label && !existingByLabel.has(label)) existingByLabel.set(label, node);
	}
	const claimed = new Set<string>();
	const matched = new Map<string, BoardNode>();
	for (const label of order) {
		const node = existingByLabel.get(label);
		if (node) {
			matched.set(label, node);
			claimed.add(node.id);
		}
	}
	// Pass 2: a renamed definition keeps the node at the same index in node order.
	parsed.forEach((entry, index) => {
		if (matched.has(entry.label)) return;
		const candidate = existing.nodes[index];
		if (candidate && !claimed.has(candidate.id)) {
			matched.set(entry.label, candidate);
			claimed.add(candidate.id);
		}
	});

	// New nodes go in a grid below everything already on the board.
	const fresh = order.filter((label) => !matched.has(label));
	const size = DEFAULT_NODE_SIZE.shape;
	// Loose spacing: these are free-board nodes, not table cells.
	const gridPositions = layoutGrid(
		fresh.map((label) => ({
			id: label,
			width: size.width,
			height: size.height,
		})),
		{ gapX: DEFAULT_GAP_X, gapY: DEFAULT_GAP_Y },
	).positions;
	const left = existing.nodes.reduce((m, n) => Math.min(m, n.position.x), Infinity);
	const bottom = existing.nodes.reduce(
		(m, n) => Math.max(m, n.position.y + (n.height ?? size.height)),
		-Infinity,
	);
	const originX = Number.isFinite(left) ? left : 0;
	const originY = Number.isFinite(bottom) ? bottom + 64 : 0;

	const idOf = new Map<string, string>();
	const nodes = order.map((label): BoardNode => {
		const old = matched.get(label);
		if (old) {
			idOf.set(label, old.id);
			return withLabel(old, label);
		}
		const id = makeId();
		idOf.set(label, id);
		const at = gridPositions[label];
		return {
			id,
			type: "shape",
			position: { x: originX + at.x, y: originY + at.y },
			width: size.width,
			height: size.height,
			data: { color: DEFAULT_BOARD_COLOR, shape: "rounded", text: label },
		};
	});

	const oldEdges = new Map(existing.edges.map((e) => [`${e.source}\n${e.target}`, e]));
	const edges: BoardEdge[] = [];
	for (const entry of parsed) {
		for (const target of entry.targets) {
			const source = idOf.get(entry.label) as string;
			const to = idOf.get(target) as string;
			const old = oldEdges.get(`${source}\n${to}`);
			edges.push(old ?? { id: makeId(), source, target: to, arrow: true });
		}
	}

	return { graph: { nodes, edges }, errors, warnings };
};
