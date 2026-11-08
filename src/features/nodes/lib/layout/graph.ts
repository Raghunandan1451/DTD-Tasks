import {
	DEFAULT_GAP_X,
	maxSize,
	type LayoutEdge,
	type LayoutNode,
	type LayoutOptions,
	type Positions,
} from "@src/features/nodes/lib/layout/types";

/** Small seeded PRNG, so the same board always lays out the same way. */
const mulberry32 = (seed: number): (() => number) => {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

export interface GraphLayoutOptions extends LayoutOptions {
	seed?: number;
	iterations?: number;
}

/**
 * Fruchterman-Reingold force-directed layout. Fixed iteration count and a seeded
 * RNG make it fully deterministic. Cost is O(n^2) per iteration, so large boards
 * get fewer iterations.
 */
export const layoutGraph = (
	nodes: readonly LayoutNode[],
	edges: readonly LayoutEdge[],
	options: GraphLayoutOptions = {},
): Positions => {
	const n = nodes.length;
	if (n === 0) return {};
	const { seed = 1, gapX = DEFAULT_GAP_X } = options;
	const iterations = options.iterations ?? (n > 200 ? 80 : 250);
	const cell = maxSize(nodes);
	// Ideal distance between connected nodes.
	const k = Math.max(cell.width, cell.height) + gapX * 2;
	const side = Math.sqrt(k * k * n);
	const random = mulberry32(seed);

	const x = new Float64Array(n);
	const y = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		x[i] = random() * side;
		y[i] = random() * side;
	}

	const index = new Map(nodes.map((node, i) => [node.id, i]));
	const links: [number, number][] = [];
	for (const edge of edges) {
		const a = index.get(edge.source);
		const b = index.get(edge.target);
		if (a !== undefined && b !== undefined && a !== b) links.push([a, b]);
	}

	const dx = new Float64Array(n);
	const dy = new Float64Array(n);
	let temperature = side / 8;
	const cooling = temperature / (iterations + 1);

	for (let step = 0; step < iterations; step++) {
		dx.fill(0);
		dy.fill(0);
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				let ox = x[i] - x[j];
				let oy = y[i] - y[j];
				let dist = Math.hypot(ox, oy);
				if (dist < 0.01) {
					// Coincident nodes: nudge apart with the seeded RNG, never Math.random.
					ox = random() - 0.5;
					oy = random() - 0.5;
					dist = Math.hypot(ox, oy) || 0.01;
				}
				const force = (k * k) / dist;
				const fx = (ox / dist) * force;
				const fy = (oy / dist) * force;
				dx[i] += fx;
				dy[i] += fy;
				dx[j] -= fx;
				dy[j] -= fy;
			}
		}
		for (const [a, b] of links) {
			const ox = x[a] - x[b];
			const oy = y[a] - y[b];
			const dist = Math.hypot(ox, oy) || 0.01;
			const force = (dist * dist) / k;
			const fx = (ox / dist) * force;
			const fy = (oy / dist) * force;
			dx[a] -= fx;
			dy[a] -= fy;
			dx[b] += fx;
			dy[b] += fy;
		}
		for (let i = 0; i < n; i++) {
			const length = Math.hypot(dx[i], dy[i]) || 0.01;
			const move = Math.min(length, temperature);
			x[i] += (dx[i] / length) * move;
			y[i] += (dy[i] / length) * move;
		}
		temperature -= cooling;
	}

	let minX = Infinity;
	let minY = Infinity;
	for (let i = 0; i < n; i++) {
		minX = Math.min(minX, x[i]);
		minY = Math.min(minY, y[i]);
	}
	const positions: Positions = {};
	nodes.forEach((node, i) => {
		positions[node.id] = {
			x: Math.round(x[i] - minX),
			y: Math.round(y[i] - minY),
		};
	});
	return positions;
};
