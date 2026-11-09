import { describe, expect, it } from "vitest";
import {
	addColumn,
	addRow,
	defaultColumns,
	removeColumn,
	removeLabel,
	removeRow,
	setLabel,
} from "@src/features/nodes/lib/gridOps";
import { layoutGrid } from "@src/features/nodes/lib/layout/grid";

let counter = 0;
const make = () => `n${++counter}`;

describe("grid operations", () => {
	it("a 1x1 grid grows by a row of `columns` nodes", () => {
		const result = addRow(["a"], 1, make);
		expect(result.items).toHaveLength(2);
		expect(result.columns).toBe(1);
		expect(result.items[0]).toBe("a");
	});

	it("adding a column puts one new node at the end of every row", () => {
		// 2 rows x 2 columns: a b / c d
		const result = addColumn(["a", "b", "c", "d"], 2, make);
		expect(result.columns).toBe(3);
		expect(result.items).toHaveLength(6);
		expect([result.items[0], result.items[1]]).toEqual(["a", "b"]);
		expect([result.items[3], result.items[4]]).toEqual(["c", "d"]);
	});

	it("completes a partly filled last row before adding to it", () => {
		const result = addRow(["a", "b", "c"], 2, make); // rows: a b / c _
		expect(result.items).toHaveLength(6);
		expect(result.items.slice(0, 3)).toEqual(["a", "b", "c"]);
	});

	it("removes a row or column and reports what was removed", () => {
		const row = removeRow(["a", "b", "c", "d"], 2, 0, make);
		expect(row.items).toEqual(["c", "d"]);
		expect(row.removed).toEqual(["a", "b"]);

		const column = removeColumn(["a", "b", "c", "d"], 2, 0, make);
		expect(column.items).toEqual(["b", "d"]);
		expect(column.columns).toBe(1);
		expect(column.removed).toEqual(["a", "c"]);
	});

	it("never removes the last row or column", () => {
		expect(removeRow(["a", "b"], 2, 0, make).items).toEqual(["a", "b"]);
		expect(removeColumn(["a", "b"], 1, 0, make).items).toEqual(["a", "b"]);
	});

	it("falls back to a square-ish width when none is stored", () => {
		expect(defaultColumns(0)).toBe(1);
		expect(defaultColumns(5)).toBe(3);
	});

	it("lays out with the given column count", () => {
		const nodes = ["a", "b", "c"].map((id) => ({ id, width: 100, height: 50 }));
		const { positions } = layoutGrid(nodes, { columns: 1 });
		expect(positions.a.x).toBe(positions.c.x);
		expect(positions.c.y).toBeGreaterThan(positions.b.y);
	});
});

describe("grid names", () => {
	it("sets a name by index, padding gaps with blanks", () => {
		expect(setLabel([], 2, "Fri")).toEqual(["", "", "Fri"]);
		expect(setLabel(["Mon"], 0, "  Monday  ")).toEqual(["Monday"]);
	});

	it("drops trailing blanks, so no names is an empty list", () => {
		expect(setLabel(["Mon"], 0, "")).toEqual([]);
		expect(setLabel(["", "Tue"], 1, "")).toEqual([]);
	});

	it("clamps a very long name", () => {
		expect(setLabel([], 0, "x".repeat(500))[0]).toHaveLength(80);
	});

	it("moves later names up when one is removed", () => {
		expect(removeLabel(["a", "b", "c"], 1)).toEqual(["a", "c"]);
		expect(removeLabel(["a"], 3)).toEqual(["a"]);
	});
});
