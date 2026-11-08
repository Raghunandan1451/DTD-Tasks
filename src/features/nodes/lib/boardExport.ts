import type { Board, BoardColor, BoardNodeType, BoardShape } from "@src/lib/db/types";
import { DEFAULT_NODE_SIZE } from "@src/features/nodes/lib/constants";
import { computeLayout, type LayoutEdge, type LayoutNode } from "@src/features/nodes/lib/layout";
import { toBoardColor } from "@src/features/nodes/lib/palette";

/**
 * Board pictures are drawn straight from the saved board, not captured from the
 * screen: the canvas only keeps visible nodes in the page, and boards that are
 * not open (all boards, the Home download) are not on screen at all.
 *
 * Split in two: `buildScene` is pure (positions, selection, bounds) and tested;
 * `renderScene` and the exporters below only draw it.
 */

export interface SceneNode {
	id: string;
	type: BoardNodeType;
	shape: BoardShape;
	color: BoardColor;
	x: number;
	y: number;
	width: number;
	height: number;
	title: string;
	text: string;
}

export interface SceneEdge {
	id: string;
	/** Where the line leaves and enters the nodes (on their outline). */
	from: { x: number; y: number };
	to: { x: number; y: number };
	label: string;
	arrow: boolean;
	dashed: boolean;
}

export interface Scene {
	name: string;
	nodes: SceneNode[];
	edges: SceneEdge[];
	/** Area to draw, in board units, with the margin included. */
	bounds: { x: number; y: number; width: number; height: number };
}

export interface BoardImageFile {
	fileName: string;
	blob: Blob;
}

export type ImageFormat = "png" | "jpg";

export interface BoardExports {
	images: BoardImageFile[];
}

const MARGIN = 40;
/** Longest side of the picture in pixels. Browsers refuse canvases much bigger than this. */
const MAX_SIDE = 8000;
const MAX_SCALE = 2;
const JPG_QUALITY = 0.92;
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

// --- Scene (pure) -----------------------------------------------------------

const sizeOf = (node: Board["nodes"][number]): { width: number; height: number } => {
	const fallback = DEFAULT_NODE_SIZE[node.type];
	return { width: node.width ?? fallback.width, height: node.height ?? fallback.height };
};

/** The point on a node's outline that faces `toward`. */
const borderPoint = (
	node: SceneNode,
	toward: { x: number; y: number },
): { x: number; y: number } => {
	const cx = node.x + node.width / 2;
	const cy = node.y + node.height / 2;
	const dx = toward.x - cx;
	const dy = toward.y - cy;
	if (dx === 0 && dy === 0) return { x: cx, y: cy };
	const halfW = node.width / 2;
	const halfH = node.height / 2;
	let t: number;
	if (node.type === "shape" && node.shape === "ellipse") {
		t = 1 / Math.sqrt((dx / halfW) ** 2 + (dy / halfH) ** 2);
	} else if (node.type === "shape" && node.shape === "diamond") {
		t = 1 / (Math.abs(dx) / halfW + Math.abs(dy) / halfH);
	} else {
		t = Math.min(
			dx === 0 ? Infinity : halfW / Math.abs(dx),
			dy === 0 ? Infinity : halfH / Math.abs(dy),
		);
	}
	return { x: cx + dx * t, y: cy + dy * t };
};

/**
 * Lays a board out for drawing. With `selectedNodeIds` (and at least one id),
 * only those nodes are kept, with the links between them. Returns null when
 * there is nothing to draw.
 */
export const buildScene = (
	board: Board,
	selectedNodeIds?: ReadonlySet<string>,
): Scene | null => {
	const mode = board.layoutMode ?? "free";

	// Tree, graph and grid boards show computed positions, not the saved ones.
	let positions: Record<string, { x: number; y: number }> = {};
	let crossLinks: ReadonlySet<string> = new Set();
	if (mode !== "free") {
		const layoutNodes: LayoutNode[] = board.nodes.map((node) => ({ id: node.id, ...sizeOf(node) }));
		const layoutEdges: LayoutEdge[] = board.edges.map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
		}));
		const layout = computeLayout(
			mode,
			layoutNodes,
			layoutEdges,
			board.treeRootId,
			board.gridColumns,
		);
		if (layout) {
			positions = layout.positions;
			crossLinks = layout.crossLinks;
		}
	}

	const onlySelected = selectedNodeIds !== undefined && selectedNodeIds.size > 0;
	const nodes: SceneNode[] = board.nodes
		.filter((node) => !onlySelected || selectedNodeIds.has(node.id))
		.map((node) => {
			const at = positions[node.id] ?? node.position;
			return {
				id: node.id,
				type: node.type,
				shape: node.data.shape ?? "rounded",
				color: toBoardColor(node.data.color),
				x: at.x,
				y: at.y,
				...sizeOf(node),
				title: node.data.title ?? "",
				text: node.data.text ?? "",
			};
		});
	if (nodes.length === 0) return null;

	const byId = new Map(nodes.map((node) => [node.id, node]));
	const edges: SceneEdge[] = [];
	for (const edge of board.edges) {
		const source = byId.get(edge.source);
		const target = byId.get(edge.target);
		if (!source || !target) continue;
		const sourceCenter = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
		const targetCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
		edges.push({
			id: edge.id,
			from: borderPoint(source, targetCenter),
			to: borderPoint(target, sourceCenter),
			label: edge.label ?? "",
			arrow: Boolean(edge.arrow),
			dashed: crossLinks.has(edge.id),
		});
	}

	const left = Math.min(...nodes.map((node) => node.x));
	const top = Math.min(...nodes.map((node) => node.y));
	const right = Math.max(...nodes.map((node) => node.x + node.width));
	const bottom = Math.max(...nodes.map((node) => node.y + node.height));
	return {
		name: board.name,
		nodes,
		edges,
		bounds: {
			x: left - MARGIN,
			y: top - MARGIN,
			width: right - left + MARGIN * 2,
			height: bottom - top + MARGIN * 2,
		},
	};
};

/** Scenes for every board that has something to draw. `selectedNodeIds` applies to `selectedBoardId` only. */
export const buildScenes = (
	boards: readonly Board[],
	selection?: { boardId: string; nodeIds: ReadonlySet<string> },
): Scene[] =>
	boards.flatMap((board) => {
		const scene = buildScene(
			board,
			selection && selection.boardId === board.id ? selection.nodeIds : undefined,
		);
		return scene ? [scene] : [];
	});

/** A safe, unique file name stem for each scene ("Plan", "Plan 2", …). */
export const uniqueFileStems = (names: readonly string[]): string[] => {
	const used = new Map<string, number>();
	return names.map((name) => {
		const stem =
			Array.from(name)
				.filter((char) => char.charCodeAt(0) >= 32 && !'<>:"/\\|?*'.includes(char))
				.join("")
				.trim()
				.slice(0, 80) || "Board";
		const key = stem.toLowerCase();
		const count = (used.get(key) ?? 0) + 1;
		used.set(key, count);
		return count === 1 ? stem : `${stem} ${count}`;
	});
};

/** Pixels per board unit: sharp for small boards, shrunk so huge ones still fit a canvas. */
export const sceneScale = (bounds: Scene["bounds"]): number =>
	Math.min(MAX_SCALE, MAX_SIDE / Math.max(bounds.width, bounds.height));

// --- Drawing ----------------------------------------------------------------

// Exports are always drawn light, so they read well on paper whatever the app theme.
const LIGHT: Record<BoardColor, { fill: string; stroke: string; ink: string; textOnly: string }> = {
	slate: { fill: "#f1f5f9", stroke: "#94a3b8", ink: "#0f172a", textOnly: "#1e293b" },
	cyan: { fill: "#cffafe", stroke: "#06b6d4", ink: "#083344", textOnly: "#0e7490" },
	emerald: { fill: "#d1fae5", stroke: "#10b981", ink: "#022c22", textOnly: "#047857" },
	amber: { fill: "#fef3c7", stroke: "#f59e0b", ink: "#451a03", textOnly: "#b45309" },
	rose: { fill: "#ffe4e6", stroke: "#f43f5e", ink: "#4c0519", textOnly: "#be123c" },
	violet: { fill: "#ede9fe", stroke: "#8b5cf6", ink: "#2e1065", textOnly: "#6d28d9" },
};
const EDGE_COLOR = "#64748b";

/** Splits text into lines no wider than `maxWidth`, honouring line breaks. */
const wrap = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
	const lines: string[] = [];
	for (const paragraph of text.split("\n")) {
		let line = "";
		for (const word of paragraph.split(/\s+/).filter(Boolean)) {
			const attempt = line ? `${line} ${word}` : word;
			if (line && ctx.measureText(attempt).width > maxWidth) {
				lines.push(line);
				line = word;
			} else {
				line = attempt;
			}
		}
		lines.push(line);
	}
	return lines;
};

const shapePath = (ctx: CanvasRenderingContext2D, node: SceneNode): void => {
	const { x, y, width, height } = node;
	ctx.beginPath();
	if (node.type === "shape" && node.shape === "ellipse") {
		ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
	} else if (node.type === "shape" && node.shape === "diamond") {
		ctx.moveTo(x + width / 2, y);
		ctx.lineTo(x + width, y + height / 2);
		ctx.lineTo(x + width / 2, y + height);
		ctx.lineTo(x, y + height / 2);
		ctx.closePath();
	} else if (node.type === "shape" && node.shape === "rect") {
		ctx.rect(x, y, width, height);
	} else {
		ctx.roundRect(x, y, width, height, node.type === "note" ? 8 : 16);
	}
};

const drawNodeText = (
	ctx: CanvasRenderingContext2D,
	node: SceneNode,
	color: string,
	centered: boolean,
): void => {
	// Diamonds only have room in the middle.
	const diamond = node.type === "shape" && node.shape === "diamond";
	const padding = 10;
	const boxWidth = (diamond ? node.width / 2 : node.width) - padding * 2;
	const lineHeight = 17;
	const rows: { text: string; bold: boolean }[] = [];

	ctx.font = `600 14px ${FONT}`;
	if (node.title) wrap(ctx, node.title, boxWidth).forEach((text) => rows.push({ text, bold: true }));
	ctx.font = `400 13px ${FONT}`;
	if (node.text) wrap(ctx, node.text, boxWidth).forEach((text) => rows.push({ text, bold: false }));
	if (rows.length === 0) return;

	// A free text node has no box to overflow, so it keeps all its lines.
	const room =
		node.type === "text"
			? rows.length
			: Math.max(1, Math.floor((node.height - padding * 2) / lineHeight));
	const shown = rows.slice(0, room);
	if (rows.length > room) shown[shown.length - 1].text = `${shown[shown.length - 1].text.trimEnd()}…`;

	const centerY = node.y + node.height / 2;
	const startY = centered
		? centerY - ((shown.length - 1) * lineHeight) / 2
		: node.y + padding + lineHeight / 2;
	ctx.fillStyle = color;
	ctx.textBaseline = "middle";
	ctx.textAlign = centered ? "center" : "left";
	const textX = centered ? node.x + node.width / 2 : node.x + padding;
	shown.forEach((row, index) => {
		ctx.font = `${row.bold ? 600 : 400} ${row.bold ? 14 : 13}px ${FONT}`;
		ctx.fillText(row.text, textX, startY + index * lineHeight, boxWidth);
	});
};

const drawEdge = (ctx: CanvasRenderingContext2D, edge: SceneEdge): void => {
	ctx.strokeStyle = EDGE_COLOR;
	ctx.fillStyle = EDGE_COLOR;
	ctx.lineWidth = 1.5;
	ctx.setLineDash(edge.dashed ? [6, 4] : []);
	ctx.beginPath();
	ctx.moveTo(edge.from.x, edge.from.y);
	ctx.lineTo(edge.to.x, edge.to.y);
	ctx.stroke();
	ctx.setLineDash([]);

	if (edge.arrow) {
		const angle = Math.atan2(edge.to.y - edge.from.y, edge.to.x - edge.from.x);
		const size = 10;
		ctx.beginPath();
		ctx.moveTo(edge.to.x, edge.to.y);
		ctx.lineTo(
			edge.to.x - size * Math.cos(angle - Math.PI / 7),
			edge.to.y - size * Math.sin(angle - Math.PI / 7),
		);
		ctx.lineTo(
			edge.to.x - size * Math.cos(angle + Math.PI / 7),
			edge.to.y - size * Math.sin(angle + Math.PI / 7),
		);
		ctx.closePath();
		ctx.fill();
	}

	if (edge.label) {
		const midX = (edge.from.x + edge.to.x) / 2;
		const midY = (edge.from.y + edge.to.y) / 2;
		ctx.font = `400 12px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		const width = ctx.measureText(edge.label).width + 10;
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(midX - width / 2, midY - 9, width, 18);
		ctx.fillStyle = "#334155";
		ctx.fillText(edge.label, midX, midY);
	}
};

const drawNode = (ctx: CanvasRenderingContext2D, node: SceneNode): void => {
	const palette = LIGHT[node.color];
	if (node.type === "text") {
		drawNodeText(ctx, node, palette.textOnly, false);
		return;
	}
	shapePath(ctx, node);
	ctx.fillStyle = palette.fill;
	ctx.fill();
	ctx.lineWidth = 2;
	ctx.strokeStyle = palette.stroke;
	ctx.stroke();
	drawNodeText(ctx, node, palette.ink, node.type === "shape");
};

/** Draws the scene on a new canvas. Null where canvas is not available (e.g. tests). */
const renderScene = (scene: Scene): HTMLCanvasElement | null => {
	if (typeof document === "undefined") return null;
	const scale = sceneScale(scene.bounds);
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.ceil(scene.bounds.width * scale));
	canvas.height = Math.max(1, Math.ceil(scene.bounds.height * scale));
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.scale(scale, scale);
	ctx.translate(-scene.bounds.x, -scene.bounds.y);
	scene.edges.forEach((edge) => drawEdge(ctx, edge));
	scene.nodes.forEach((node) => drawNode(ctx, node));
	return canvas;
};

const MIME: Record<ImageFormat, string> = { png: "image/png", jpg: "image/jpeg" };

/** The scene as a picture, or null when it could not be drawn. The background is white, so JPG has no black areas. */
const sceneToImage = async (scene: Scene, format: ImageFormat): Promise<Blob | null> => {
	const canvas = renderScene(scene);
	if (!canvas) return null;
	return new Promise((resolve) => canvas.toBlob(resolve, MIME[format], JPG_QUALITY));
};

/** One picture per scene, named after the board. Used by the Boards and Home downloads. */
export const buildBoardExports = async (
	scenes: readonly Scene[],
	format: ImageFormat = "png",
): Promise<BoardExports> => {
	const stems = uniqueFileStems(scenes.map((scene) => scene.name));
	const images: BoardImageFile[] = [];
	for (let index = 0; index < scenes.length; index++) {
		const blob = await sceneToImage(scenes[index], format);
		if (blob) images.push({ fileName: `${stems[index]}.${format}`, blob });
	}
	return { images };
};
