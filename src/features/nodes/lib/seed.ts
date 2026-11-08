import { newId } from "@src/lib/db/newId";
import {
	BOARD_COLORS,
	BOARD_SHAPES,
	type BoardEdge,
	type BoardNode,
	type BoardNodeType,
} from "@src/lib/db/types";
import { DEFAULT_NODE_SIZE } from "@src/features/nodes/lib/constants";
import type { Snapshot } from "@src/features/nodes/lib/history";

const TYPES: readonly BoardNodeType[] = ["note", "shape", "text"];
const COLUMNS = 25;

/** A grid of mixed nodes joined by edges, for checking pan and zoom on a big board. Dev only. */
export const buildSeed = (count: number = 500): Snapshot => {
	const nodes: BoardNode[] = Array.from({ length: count }, (_, i) => {
		const type = TYPES[i % TYPES.length];
		const size = DEFAULT_NODE_SIZE[type];
		return {
			id: newId(),
			type,
			position: { x: (i % COLUMNS) * 280, y: Math.floor(i / COLUMNS) * 200 },
			width: size.width,
			height: size.height,
			data: {
				color: BOARD_COLORS[i % BOARD_COLORS.length],
				...(type === "note" ? { title: `Note ${i + 1}`, text: "Seeded note text" } : {}),
				...(type === "shape"
					? {
							shape: BOARD_SHAPES[i % BOARD_SHAPES.length],
							text: `Shape ${i + 1}`,
						}
					: {}),
				...(type === "text" ? { text: `Label ${i + 1}` } : {}),
			},
		};
	});

	const edges: BoardEdge[] = [];
	nodes.forEach((node, i) => {
		const next = nodes[i + 1];
		if (next && (i + 1) % COLUMNS !== 0) {
			edges.push({
				id: newId(),
				source: node.id,
				target: next.id,
				arrow: true,
			});
		}
		const below = nodes[i + COLUMNS];
		if (below && i % 5 === 0) {
			edges.push({ id: newId(), source: node.id, target: below.id });
		}
	});

	return { nodes, edges };
};
