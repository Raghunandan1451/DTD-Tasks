import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getTimelineDays,
	mergeTimelineDays,
	type TimelineSources,
} from "@src/features/home/lib/timeline";
import type { ExpenseDay } from "@src/lib/store/selectors/timelineExpenseSelectors";
import type { JournalEntry, MarkdownLogEntry } from "@src/lib/db/types";
import type { RootState } from "@src/lib/store/store";
import { getDB, resetDBForTests } from "@src/lib/db/database";
import { logMarkdown } from "@src/lib/db/markdownLogRepo";

const at = (y: number, m: number, d: number, h = 12, min = 0) =>
	new Date(y, m - 1, d, h, min).getTime();

const note = (id: string, createdAt: number): JournalEntry => ({
	id,
	text: id,
	createdAt,
});

const logRow = (
	id: string,
	fileId: string,
	day: string,
	updatedAt: number,
	action: MarkdownLogEntry["action"] = "edited",
): MarkdownLogEntry => ({
	id,
	fileId,
	name: `${fileId}.md`,
	action,
	day,
	createdAt: updatedAt,
	updatedAt,
});

const expenseDay = (
	day: string,
	ids: string[],
	debit = 0,
	credit = 0,
): ExpenseDay => ({
	day,
	items: ids.map((id) => ({ id, date: day, group: "Food", name: id, amount: 1 })),
	totals: { count: ids.length, debit, credit },
});

const sources = (overrides: Partial<TimelineSources> = {}): TimelineSources => ({
	journal: [],
	expenseDays: [],
	markdownLog: [],
	liveFileIds: new Set<string>(),
	...overrides,
});

const range = { fromDay: "2026-10-01", toDay: "2026-10-31" };

describe("mergeTimelineDays", () => {
	it("returns nothing when there is nothing to show", () => {
		expect(mergeTimelineDays(range, "all", sources())).toEqual([]);
	});

	it("merges all three sources into days, newest first", () => {
		const days = mergeTimelineDays(
			range,
			"all",
			sources({
				journal: [note("j1", at(2026, 10, 10)), note("j2", at(2026, 10, 20))],
				markdownLog: [logRow("m1", "f1", "2026-10-15", at(2026, 10, 15))],
				expenseDays: [
					expenseDay("2026-10-20", ["e1"], 5),
					expenseDay("2026-10-05", ["e2"]),
				],
			}),
		);
		expect(days.map((d) => d.day)).toEqual([
			"2026-10-20",
			"2026-10-15",
			"2026-10-10",
			"2026-10-05",
		]);
	});

	it("orders a day as journal, then files, then expenses", () => {
		const [day] = mergeTimelineDays(
			range,
			"all",
			sources({
				expenseDays: [expenseDay("2026-10-20", ["e1", "e2"], 2)],
				markdownLog: [logRow("m1", "f1", "2026-10-20", at(2026, 10, 20))],
				journal: [
					note("early", at(2026, 10, 20, 8)),
					note("late", at(2026, 10, 20, 21)),
				],
			}),
		);
		expect(day.items.map((i) => i.id)).toEqual([
			"journal:late",
			"journal:early",
			"file:m1",
			"expense:e1",
			"expense:e2",
		]);
	});

	it("attaches expense totals to the day", () => {
		const [day] = mergeTimelineDays(
			range,
			"all",
			sources({
				journal: [note("j", at(2026, 10, 20))],
				expenseDays: [expenseDay("2026-10-20", ["a", "b"], 1000, 79)],
			}),
		);
		expect(day.expenseTotals).toEqual({ count: 2, debit: 1000, credit: 79 });
	});

	it("gives a day without expenses zero totals", () => {
		const [day] = mergeTimelineDays(
			range,
			"all",
			sources({ journal: [note("j", at(2026, 10, 20))] }),
		);
		expect(day.expenseTotals).toEqual({ count: 0, debit: 0, credit: 0 });
	});

	it("files a past-dated expense once, under its own date", () => {
		const days = mergeTimelineDays(
			range,
			"all",
			sources({ expenseDays: [expenseDay("2026-10-03", ["old"], 9)] }),
		);
		expect(days).toHaveLength(1);
		expect(days[0].day).toBe("2026-10-03");
		expect(days[0].items.filter((i) => i.id === "expense:old")).toHaveLength(1);
	});

	it("uses the local day for notes around midnight", () => {
		const days = mergeTimelineDays(
			range,
			"all",
			sources({
				journal: [
					note("late", at(2026, 10, 20, 23, 30)),
					note("early", at(2026, 10, 21, 0, 15)),
				],
			}),
		);
		expect(days.map((d) => [d.day, d.items.map((i) => i.id)])).toEqual([
			["2026-10-21", ["journal:early"]],
			["2026-10-20", ["journal:late"]],
		]);
	});

	it("applies the filter to every source", () => {
		const all = sources({
			journal: [note("j", at(2026, 10, 20))],
			markdownLog: [logRow("m", "f", "2026-10-20", at(2026, 10, 20))],
			expenseDays: [expenseDay("2026-10-20", ["e"], 1)],
		});
		const kinds = (filter: Parameters<typeof mergeTimelineDays>[1]) =>
			mergeTimelineDays(range, filter, all).flatMap((d) =>
				d.items.map((i) => i.kind),
			);

		expect(kinds("journal")).toEqual(["journal"]);
		expect(kinds("files")).toEqual(["file"]);
		expect(kinds("expenses")).toEqual(["expense"]);
		expect(kinds("all")).toEqual(["journal", "file", "expense"]);
	});

	it("does not leave an empty day behind when a filter removes its items", () => {
		const days = mergeTimelineDays(
			range,
			"journal",
			sources({ expenseDays: [expenseDay("2026-10-20", ["e"], 1)] }),
		);
		expect(days).toEqual([]);
	});

	it("keeps range edges inclusive and drops anything outside", () => {
		const days = mergeTimelineDays(
			range,
			"all",
			sources({
				journal: [
					note("before", at(2026, 9, 30, 23, 59)),
					note("first", at(2026, 10, 1, 0, 0)),
					note("last", at(2026, 10, 31, 23, 59)),
					note("after", at(2026, 11, 1, 0, 0)),
				],
				markdownLog: [logRow("m", "f", "2026-11-01", 1)],
				expenseDays: [expenseDay("2026-09-30", ["x"])],
			}),
		);
		expect(days.map((d) => d.day)).toEqual(["2026-10-31", "2026-10-01"]);
	});

	it("marks files that still exist as live and removed ones as not", () => {
		const [day] = mergeTimelineDays(
			range,
			"files",
			sources({
				liveFileIds: new Set(["alive"]),
				markdownLog: [
					logRow("m1", "alive", "2026-10-20", 2),
					logRow("m2", "gone", "2026-10-20", 1, "deleted"),
				],
			}),
		);
		expect(
			day.items.map((i) => i.kind === "file" && [i.entry.fileId, i.isLive]),
		).toEqual([
			["alive", true],
			["gone", false],
		]);
	});

	it("treats every file as live while the file tree is not loaded", () => {
		const [day] = mergeTimelineDays(
			range,
			"files",
			sources({
				liveFileIds: null,
				markdownLog: [logRow("m", "f", "2026-10-20", 1)],
			}),
		);
		expect(day.items[0]).toMatchObject({ kind: "file", isLive: true });
	});

	it("returns nothing for an invalid or reversed range", () => {
		const data = sources({ journal: [note("j", at(2026, 10, 20))] });
		expect(
			mergeTimelineDays({ fromDay: "2026-10-31", toDay: "2026-10-01" }, "all", data),
		).toEqual([]);
		expect(
			mergeTimelineDays({ fromDay: "bad", toDay: "2026-10-01" }, "all", data),
		).toEqual([]);
	});
});

describe("getTimelineDays", () => {
	const state = (loaded: boolean) =>
		({
			expenses: {
				expenses: [
					{ id: "e1", date: "2026-10-20", group: "Food", name: "Lunch", amount: 100, type: "Dr" },
					{ id: "e2", date: "2026-10-20", group: "Salary", name: "Pay", amount: 79, type: "Cr" },
				],
				selectedDate: "2026-10-20",
				loaded: true,
			},
			fileManager: {
				files: [{ id: "alive", path: "a.md", type: "file", content: "" }],
				selectedFile: null,
				content: "",
				loaded,
			},
		}) as unknown as RootState;

	beforeEach(async () => {
		await resetDBForTests();
		globalThis.indexedDB = new IDBFactory();
	});

	it("merges IndexedDB journal and log rows with store expenses", async () => {
		const db = await getDB();
		await db.put("journal", note("j1", at(2026, 10, 20, 9)));
		await logMarkdown("alive", "a.md", "edited", undefined, at(2026, 10, 20, 10));
		await logMarkdown("gone", "Old/b.md", "deleted", undefined, at(2026, 10, 20, 11));

		const [day] = await getTimelineDays(range, "all", () => state(true));

		expect(day.day).toBe("2026-10-20");
		expect(day.expenseTotals).toEqual({ count: 2, debit: 100, credit: 79 });
		const summary = day.items.map((i) =>
			i.kind === "file" ? [i.kind, i.entry.name, i.isLive] : [i.kind, i.id],
		);
		expect(summary).toEqual([
			["journal", "journal:j1"],
			["file", "Old/b.md", false],
			["file", "a.md", true],
			["expense", "expense:e1"],
			["expense", "expense:e2"],
		]);
	});

	it("returns only the requested kind for a filter", async () => {
		const db = await getDB();
		await db.put("journal", note("j1", at(2026, 10, 20, 9)));
		await logMarkdown("alive", "a.md", "edited", undefined, at(2026, 10, 20, 10));

		const days = await getTimelineDays(range, "journal", () => state(true));

		expect(days[0].items.map((i) => i.kind)).toEqual(["journal"]);
	});

	it("does not call files deleted when the tree has not loaded", async () => {
		await logMarkdown("anything", "x.md", "edited", undefined, at(2026, 10, 20));
		const [day] = await getTimelineDays(range, "files", () => state(false));
		expect(day.items[0]).toMatchObject({ kind: "file", isLive: true });
	});

	it("returns an empty list for an invalid range without reading the store", async () => {
		const getState = vi.fn(() => state(true));
		expect(await getTimelineDays({ fromDay: "x", toDay: "y" }, "all", getState)).toEqual([]);
		expect(getState).not.toHaveBeenCalled();
	});
});
