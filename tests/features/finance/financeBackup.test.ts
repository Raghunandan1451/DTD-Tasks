import { describe, it, expect } from "vitest";
import {
	buildFinanceBackup,
	FINANCE_BACKUP_VERSION,
	mergeParsedBackups,
	parseFinanceBackup,
	parseFinanceBackupText,
} from "@src/features/finance/lib/financeBackup";
import type { ExpenseEntry, FinanceState } from "@src/features/finance/type";

const entry = (id: string, date = "2026-10-01"): ExpenseEntry => ({
	id,
	date,
	name: `item ${id}`,
	group: "Food",
	amount: 10,
	type: "Dr",
});

const finance: FinanceState = {
	salary: { amount: 50000, dayOfMonth: 1 },
	currentBalance: 1000,
	manualOverride: true,
	groups: ["Food"],
	loaded: true,
};

const expensesState = {
	expenses: [entry("a"), entry("b")],
	selectedDate: "2026-10-01",
	loaded: true,
};

describe("buildFinanceBackup / parseFinanceBackup", () => {
	it("round-trips a combined backup", () => {
		const backup = buildFinanceBackup(finance, expensesState);
		expect(backup.version).toBe(FINANCE_BACKUP_VERSION);

		const parsed = parseFinanceBackup(JSON.parse(JSON.stringify(backup)));
		expect(parsed.finance).toEqual(finance);
		expect(parsed.expenses).toEqual(expensesState.expenses);
		expect(parsed.skippedEntries).toBe(0);
	});

	it("accepts a combined backup holding only one section", () => {
		const onlyFinance = parseFinanceBackup(buildFinanceBackup(finance));
		expect(onlyFinance.finance).toEqual(finance);
		expect(onlyFinance.expenses).toBeUndefined();

		const onlyExpenses = parseFinanceBackup(
			buildFinanceBackup(undefined, expensesState),
		);
		expect(onlyExpenses.expenses).toHaveLength(2);
		expect(onlyExpenses.finance).toBeUndefined();
	});

	it("accepts the legacy expenses-data.json", () => {
		const parsed = parseFinanceBackup(expensesState);
		expect(parsed.expenses).toHaveLength(2);
		expect(parsed.finance).toBeUndefined();
	});

	it("accepts the legacy finance-data.json", () => {
		const parsed = parseFinanceBackup(finance);
		expect(parsed.finance).toEqual(finance);
		expect(parsed.expenses).toBeUndefined();
	});

	it("accepts an empty expense list", () => {
		expect(
			parseFinanceBackup({ ...expensesState, expenses: [] }).expenses,
		).toEqual([]);
	});

	it.each([
		["null", null],
		["an array", [1, 2]],
		["a string", "hello"],
		["calendar data", { events: [], currentDate: "2026-10-01" }],
		["markdown data", { files: [], selectedFile: null, content: "" }],
	])("rejects %s", (_label, input) => {
		expect(() => parseFinanceBackup(input)).toThrow(/backup file/);
	});

	it("drops malformed expense entries and reports how many", () => {
		const parsed = parseFinanceBackup({
			...expensesState,
			expenses: [
				entry("ok"),
				{ id: "no-amount", date: "2026-10-01", group: "x", name: "x" },
				{ id: "bad-date", date: "yesterday", group: "x", name: "x", amount: 1 },
				null,
			],
		});
		expect(parsed.expenses?.map((e) => e.id)).toEqual(["ok"]);
		expect(parsed.skippedEntries).toBe(3);
	});

	it("rejects a file where every expense entry is malformed", () => {
		expect(() =>
			parseFinanceBackup({ ...expensesState, expenses: [{ nope: true }] }),
		).toThrow(/No valid expense entries/);
	});

	it("rejects finance data that would corrupt the slice", () => {
		expect(() =>
			parseFinanceBackup({ ...finance, groups: [1, 2] }),
		).toThrow(/group list/);
		expect(() =>
			parseFinanceBackup({ ...finance, currentBalance: "lots" }),
		).toThrow(/current balance/);
		expect(() =>
			parseFinanceBackup({ ...finance, salary: { amount: "x", dayOfMonth: 1 } }),
		).toThrow(/salary/);
	});
});

describe("parseFinanceBackupText", () => {
	it("names the file when the JSON is invalid", () => {
		expect(() => parseFinanceBackupText("{nope", "broken.json")).toThrow(
			"broken.json is not valid JSON",
		);
	});

	it("names the file when the content isn't a backup", () => {
		expect(() =>
			parseFinanceBackupText(JSON.stringify({ events: [] }), "calendar.json"),
		).toThrow(/^calendar\.json: /);
	});
});

describe("mergeParsedBackups", () => {
	it("combines both legacy files picked together", () => {
		const merged = mergeParsedBackups([
			parseFinanceBackup(finance),
			parseFinanceBackup(expensesState),
		]);
		expect(merged.finance).toEqual(finance);
		expect(merged.expenses).toHaveLength(2);
	});

	it("lets later files win per section and sums skipped entries", () => {
		const merged = mergeParsedBackups([
			{ expenses: [entry("old")], skippedEntries: 1 },
			{ expenses: [entry("new")], skippedEntries: 2 },
		]);
		expect(merged.expenses?.map((e) => e.id)).toEqual(["new"]);
		expect(merged.skippedEntries).toBe(3);
	});
});
