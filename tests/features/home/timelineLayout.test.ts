import { describe, expect, it } from "vitest";
import {
	buildEntries,
	buildTimelineRows,
	daysBetween,
	describeExpenses,
	describeFiles,
	formatDayLabel,
	type DayRow,
} from "@src/features/home/lib/timelineLayout";
import type {
	ExpenseTimelineItem,
	FileTimelineItem,
	JournalTimelineItem,
	TimelineDay,
} from "@src/features/home/lib/timelineTypes";
import type { MarkdownAction } from "@src/lib/db/types";

const journal = (id: string): JournalTimelineItem => ({
	kind: "journal",
	id: `journal:${id}`,
	entry: { id, text: id, createdAt: 0 },
});

const file = (
	id: string,
	action: MarkdownAction,
	name = `${id}.md`,
	meta?: FileTimelineItem["entry"]["meta"],
): FileTimelineItem => ({
	kind: "file",
	id: `file:${id}`,
	isLive: true,
	entry: { id, fileId: id, name, action, day: "2026-10-20", createdAt: 0, updatedAt: 0, meta },
});

const expense = (id: string, amount: number, type?: "Dr" | "Cr"): ExpenseTimelineItem => ({
	kind: "expense",
	id: `expense:${id}`,
	entry: { id, date: "2026-10-20", group: "Food", name: id, amount, type },
});

const day = (date: string, items: TimelineDay["items"], debit = 0, credit = 0): TimelineDay => ({
	day: date,
	items,
	expenseTotals: {
		count: items.filter((i) => i.kind === "expense").length,
		debit,
		credit,
	},
});

const sides = () => {
	let toggle = false;
	return () => {
		toggle = !toggle;
		return toggle ? ("right" as const) : ("left" as const);
	};
};

describe("formatDayLabel", () => {
	it("names today and yesterday, then uses a full date", () => {
		expect(formatDayLabel("2026-11-02", "2026-11-02")).toBe("Today");
		expect(formatDayLabel("2026-11-01", "2026-11-02")).toBe("Yesterday");
		expect(formatDayLabel("2026-10-27", "2026-11-02")).toBe("Tue, 27 Oct 2026");
	});

	it("handles month and year boundaries", () => {
		expect(formatDayLabel("2025-12-31", "2026-01-01")).toBe("Yesterday");
		expect(formatDayLabel("2026-01-05", "2026-11-02")).toBe("Mon, 5 Jan 2026");
	});
});

describe("daysBetween", () => {
	it("counts whole calendar days, also across a DST change", () => {
		expect(daysBetween("2026-10-21", "2026-10-20")).toBe(1);
		expect(daysBetween("2026-03-30", "2026-03-27")).toBe(3);
		expect(daysBetween("2026-10-20", "2026-10-21")).toBe(-1);
	});
});

describe("describe helpers", () => {
	it("summarises expenses and leaves out zero parts", () => {
		expect(describeExpenses({ count: 6, debit: 1000, credit: 79 })).toBe(
			"6 expenses · Spent ₹1,000 · Received ₹79",
		);
		expect(describeExpenses({ count: 1, debit: 0, credit: 79 })).toBe(
			"1 expense · Received ₹79",
		);
		expect(describeExpenses({ count: 2, debit: 1240.5, credit: 0 })).toBe(
			"2 expenses · Spent ₹1,240.50",
		);
	});

	it("summarises file groups and single rows", () => {
		expect(describeFiles("edited", [file("a", "edited"), file("b", "edited")])).toBe(
			"Edited 2 files",
		);
		expect(describeFiles("edited", [file("a", "edited", "Notes/Idea.md")])).toBe(
			"Edited Notes/Idea.md",
		);
		expect(
			describeFiles("renamed", [file("a", "renamed", "New.md", { oldName: "Old.md" })]),
		).toBe("Renamed Old.md → New.md");
		expect(
			describeFiles("created", [
				file("a", "created", "A", { isFolder: true }),
				file("b", "created", "B", { isFolder: true }),
			]),
		).toBe("Created 2 folders");
		expect(
			describeFiles("deleted", [
				file("a", "deleted", "A", { isFolder: true }),
				file("b", "deleted"),
			]),
		).toBe("Deleted 2 items");
	});
});

describe("buildEntries", () => {
	it("keeps journal notes individual and collapses same-type automatic rows", () => {
		const entries = buildEntries(
			day(
				"2026-10-20",
				[
					journal("j1"),
					journal("j2"),
					file("f1", "edited"),
					file("f2", "edited"),
					file("f3", "edited"),
					file("f4", "edited"),
					file("f5", "created"),
					expense("e1", 100, "Dr"),
					expense("e2", 79, "Cr"),
				],
				100,
				79,
			),
			sides(),
		);

		expect(entries.map((e) => e.type)).toEqual([
			"journal",
			"journal",
			"files",
			"files",
			"expenses",
		]);
		const edited = entries.find((e) => e.type === "files" && e.action === "edited");
		expect(edited && edited.type === "files" && edited.items).toHaveLength(4);
		const expenses = entries.find((e) => e.type === "expenses");
		expect(expenses && expenses.type === "expenses" && expenses.totals).toEqual({
			count: 2,
			debit: 100,
			credit: 79,
		});
	});

	it("alternates journal sides", () => {
		const entries = buildEntries(day("2026-10-20", [journal("a"), journal("b"), journal("c")]), sides());
		expect(entries.map((e) => e.type === "journal" && e.side)).toEqual([
			"right",
			"left",
			"right",
		]);
	});

	it("gives every entry a unique key", () => {
		const entries = buildEntries(
			day("2026-10-20", [journal("a"), file("f", "edited"), file("g", "created"), expense("e", 1)]),
			sides(),
		);
		expect(new Set(entries.map((e) => e.key)).size).toBe(entries.length);
	});
});

describe("buildTimelineRows", () => {
	const today = "2026-11-02";

	it("adds no gap for adjacent days or up to 3 skipped days", () => {
		const rows = buildTimelineRows(
			[
				day("2026-11-02", [journal("a")]),
				day("2026-11-01", [journal("b")]),
				day("2026-10-28", [journal("c")]), // 3 days skipped (Oct 29-31)
			],
			today,
		);
		expect(rows.map((r) => r.type)).toEqual(["day", "day", "day"]);
	});

	it("adds a dotted gap when more than 3 days are skipped", () => {
		const rows = buildTimelineRows(
			[day("2026-11-02", [journal("a")]), day("2026-10-27", [journal("b")])],
			today,
		);
		expect(rows.map((r) => r.type)).toEqual(["day", "gap", "day"]);
		const gap = rows[1];
		expect(gap.type === "gap" && gap.skippedDays).toBe(5);
	});

	it("marks today, labels days and counts underlying activities", () => {
		const [first, second] = buildTimelineRows(
			[
				day("2026-11-02", [journal("a"), expense("e1", 1), expense("e2", 2)]),
				day("2026-11-01", [journal("b")]),
			],
			today,
		) as DayRow[];
		expect([first.isToday, first.label, first.count]).toEqual([true, "Today", 3]);
		expect([second.isToday, second.label, second.count]).toEqual([false, "Yesterday", 1]);
	});

	it("alternates journal sides down the whole feed", () => {
		const rows = buildTimelineRows(
			[
				day("2026-11-02", [journal("a"), journal("b")]),
				day("2026-11-01", [journal("c")]),
			],
			today,
		) as DayRow[];
		const sidesSeen = rows.flatMap((r) =>
			r.entries.map((e) => (e.type === "journal" ? e.side : null)),
		);
		expect(sidesSeen).toEqual(["right", "left", "right"]);
	});

	it("returns no rows for no days", () => {
		expect(buildTimelineRows([], today)).toEqual([]);
	});
});
