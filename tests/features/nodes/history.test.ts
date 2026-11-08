import { describe, expect, it } from "vitest";
import {
	canRedo,
	canUndo,
	commitChange,
	createHistory,
	recordHistory,
	redo,
	undo,
	type History,
	type Snapshot,
} from "@src/features/nodes/lib/history";

const at = (x: number, y = 0): Snapshot => ({
	nodes: [
		{
			id: "n1",
			type: "note",
			position: { x, y },
			data: { color: "slate" },
		},
	],
	edges: [],
});

const xOf = (snapshot: Snapshot): number => snapshot.nodes[0].position.x;

describe("undo and redo", () => {
	it("steps back and forward through recorded states", () => {
		let history = createHistory();
		history = recordHistory(history, at(0));
		history = recordHistory(history, at(10));
		// The board is now at x = 20.

		const first = undo(history, at(20));
		expect(first && xOf(first.snapshot)).toBe(10);
		const second = undo(first!.history, first!.snapshot);
		expect(second && xOf(second.snapshot)).toBe(0);
		expect(undo(second!.history, second!.snapshot)).toBeNull();

		const forward = redo(second!.history, second!.snapshot);
		expect(forward && xOf(forward.snapshot)).toBe(10);
		const last = redo(forward!.history, forward!.snapshot);
		expect(last && xOf(last.snapshot)).toBe(20);
		expect(redo(last!.history, last!.snapshot)).toBeNull();
	});

	it("reports what can be undone or redone", () => {
		const fresh = createHistory();
		expect(canUndo(fresh)).toBe(false);
		expect(canRedo(fresh)).toBe(false);

		const recorded = recordHistory(fresh, at(0));
		expect(canUndo(recorded)).toBe(true);

		const step = undo(recorded, at(5))!;
		expect(canUndo(step.history)).toBe(false);
		expect(canRedo(step.history)).toBe(true);
	});

	it("does nothing when there is nothing to undo or redo", () => {
		expect(undo(createHistory(), at(0))).toBeNull();
		expect(redo(createHistory(), at(0))).toBeNull();
	});

	it("drops the redo stack when a new change is recorded", () => {
		let history = recordHistory(createHistory(), at(0));
		history = undo(history, at(5))!.history;
		expect(canRedo(history)).toBe(true);

		history = recordHistory(history, at(1));
		expect(canRedo(history)).toBe(false);
	});

	it("does not change the history it was given", () => {
		const history = recordHistory(createHistory(), at(0));
		const copy: History = structuredClone(history);
		undo(history, at(1));
		redo(history, at(1));
		expect(history).toEqual(copy);
	});
});

describe("history cap", () => {
	it("keeps at most 50 steps and drops the oldest first", () => {
		let history = createHistory();
		for (let i = 0; i < 60; i++) history = recordHistory(history, at(i));

		expect(history.past).toHaveLength(50);
		expect(xOf(history.past[0])).toBe(10);
		expect(xOf(history.past[49])).toBe(59);
	});

	it("undoes all 50 kept steps and no more", () => {
		let history = createHistory();
		for (let i = 0; i < 60; i++) history = recordHistory(history, at(i));

		let current = at(60);
		let steps = 0;
		for (let step = undo(history, current); step; step = undo(history, current)) {
			history = step.history;
			current = step.snapshot;
			steps++;
		}
		expect(steps).toBe(50);
		expect(xOf(current)).toBe(10);
	});

	it("caps the redo stack too", () => {
		let history: History = { past: [], future: [] };
		for (let i = 0; i < 60; i++) history = recordHistory(history, at(i));
		let current = at(60);
		for (let i = 0; i < 50; i++) {
			const step = undo(history, current)!;
			history = step.history;
			current = step.snapshot;
		}
		expect(history.future.length).toBeLessThanOrEqual(50);
	});
});

describe("coalescing a drag into one step", () => {
	it("records one step for a drag made of many small moves", () => {
		let history = createHistory();
		const before = at(0);
		let current = before;

		// 100 intermediate positions: the editor never records these...
		for (let x = 1; x <= 100; x++) current = at(x);
		// ...and commits once, when the drag stops.
		history = commitChange(history, before, current);

		expect(history.past).toHaveLength(1);
		const undone = undo(history, current)!;
		expect(xOf(undone.snapshot)).toBe(0);
		expect(canUndo(undone.history)).toBe(false);
	});

	it("records nothing when the drag ends where it started", () => {
		const history = commitChange(createHistory(), at(5, 5), at(5, 5));
		expect(history.past).toHaveLength(0);
	});

	it("keeps the redo stack when nothing changed", () => {
		let history = recordHistory(createHistory(), at(0));
		history = undo(history, at(5))!.history;

		const unchanged = commitChange(history, at(0), at(0));
		expect(canRedo(unchanged)).toBe(true);
	});
});
