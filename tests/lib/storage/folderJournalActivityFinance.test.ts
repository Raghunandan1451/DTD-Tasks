import { describe, expect, it, vi } from "vitest";
import type { ExpenseEntry, FinanceState } from "@src/features/finance/type";
import { createFolderActivityStore } from "@src/lib/storage/folder/folderActivityStore";
import { createFolderFinanceStore } from "@src/lib/storage/folder/folderFinanceStore";
import { createFolderJournalStore } from "@src/lib/storage/folder/folderJournalStore";
import { toLocalDay } from "@src/lib/utils/isoDate";
import { fakeFs } from "./fakeFolderFs";


describe("folder journal store", () => {
	it("keeps every note of a day in one file under the year", async () => {
		const h = fakeFs();
		const store = createFolderJournalStore(h.fs);
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 10, 15, 9, 0));
		const a = await store.add({ text: "morning" });
		vi.setSystemTime(new Date(2026, 10, 15, 21, 0));
		await store.add({ text: "night", mood: 4, tags: ["x"] });
		vi.useRealTimers();
		const file = JSON.parse(h.files.get("Journal/2026/2026-11-15.json")!);
		expect(file.entries.map((e: { text: string }) => e.text)).toEqual(["morning", "night"]);
		expect(a.createdAt).toBe(new Date(2026, 10, 15, 9, 0).getTime());
		expect([...h.files.keys()].filter((k) => k.startsWith("Journal/")).length).toBe(1);
	});

	it("editing a note rewrites only its own day and keeps createdAt", async () => {
		const h = fakeFs();
		const store = createFolderJournalStore(h.fs);
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 10, 14, 12, 0));
		const old = await store.add({ text: "old" });
		vi.setSystemTime(new Date(2026, 10, 15, 12, 0));
		await store.add({ text: "new" });
		vi.useRealTimers();
		const before = h.files.get("Journal/2026/2026-11-15.json");
		const updated = await store.update(old.id, { text: "edited", mood: 5 });
		expect(updated.createdAt).toBe(old.createdAt);
		expect(updated.text).toBe("edited");
		expect(h.files.get("Journal/2026/2026-11-15.json")).toBe(before);
		expect(JSON.parse(h.files.get("Journal/2026/2026-11-14.json")!).entries[0].text).toBe("edited");
	});

	it("reads back from a second store: ranges, time before, on this day", async () => {
		const h = fakeFs();
		const first = createFolderJournalStore(h.fs);
		vi.useFakeTimers({ toFake: ["Date"] });
		for (const d of [new Date(2024, 10, 15, 8), new Date(2025, 10, 15, 8), new Date(2026, 10, 10, 8), new Date(2026, 10, 15, 8)]) {
			vi.setSystemTime(d);
			await first.add({ text: d.toISOString() });
		}
		vi.useRealTimers();
		const second = createFolderJournalStore(h.fs);
		const range = await second.inRange(new Date(2026, 10, 1).getTime(), new Date(2026, 11, 1).getTime());
		expect(range.map((e) => toLocalDay(e.createdAt))).toEqual(["2026-11-15", "2026-11-10"]);
		expect(await second.timeBefore(new Date(2026, 10, 15, 0, 0).getTime())).toBe(new Date(2026, 10, 10, 8).getTime());
		expect(await second.timeBefore(new Date(2024, 0, 1).getTime())).toBeNull();
		const onThisDay = await second.onThisDay(new Date(2026, 10, 15));
		expect(onThisDay.map((e) => toLocalDay(e.createdAt))).toEqual(["2025-11-15", "2024-11-15"]);
	});

	it("deleting the last note of a day trashes the day file and the picture", async () => {
		const h = fakeFs();
		const store = createFolderJournalStore(h.fs);
		const blob = new Blob([new Uint8Array([1, 2, 3, 255])], { type: "image/png" });
		const imageId = await store.putImage(blob);
		const entry = await store.add({ text: "with picture", imageId });
		expect([...h.files.keys()].some((k) => k === `Journal/images/${imageId}.png`)).toBe(true);
		await store.remove(entry.id);
		expect(h.trashed.sort()).toEqual([
			`Journal/${toLocalDay(entry.createdAt).slice(0, 4)}/${toLocalDay(entry.createdAt)}.json`,
			`Journal/images/${imageId}.png`,
		].sort());
	});

	it("round-trips a picture as a real image file", async () => {
		const h = fakeFs();
		const store = createFolderJournalStore(h.fs);
		const id = await store.putImage(new Blob([new Uint8Array([9, 8, 7])], { type: "image/jpeg" }));
		expect(h.files.has(`Journal/images/${id}.jpg`)).toBe(true);
		const back = await store.getImage(id);
		expect(back?.type).toBe("image/jpeg");
		expect(back?.size).toBe(3);
		expect(await store.getImage("missing")).toBeNull();
	});

	it("keeps a damaged day file aside and reports it", async () => {
		const h = fakeFs({ "Journal/2026/2026-11-15.json": "{broken" });
		const store = createFolderJournalStore(h.fs);
		const found = await store.inRange(new Date(2026, 10, 15).getTime(), new Date(2026, 10, 16).getTime());
		expect(found).toEqual([]);
		expect((await store.problems())[0].file).toBe("2026/2026-11-15.json");
		const copies = [...h.files.entries()].filter(([k]) => k.includes(".damaged-"));
		expect(copies).toHaveLength(1);
		expect(copies[0][1]).toBe("{broken");
	});

	it("rejects an edit of a note that is gone", async () => {
		const store = createFolderJournalStore(fakeFs().fs);
		await expect(store.update("ghost", { text: "x" })).rejects.toThrow("no longer exists");
	});
});

describe("folder activity store", () => {
	it("keeps repeated edits in a day as one row, in the month file", async () => {
		const h = fakeFs();
		const store = createFolderActivityStore(h.fs);
		const now = new Date(2026, 10, 15, 10).getTime();
		await store.log("f1", "a.md", "created", undefined, now);
		await store.log("f1", "a.md", "edited", undefined, now + 1000);
		await store.log("f1", "a.md", "edited", undefined, now + 2000);
		await store.log("f1", "b.md", "renamed", { oldName: "a.md" }, now + 3000);
		await store.log("f1", "c.md", "renamed", { oldName: "b.md" }, now + 4000);
		const month = JSON.parse(h.files.get(".dtdtasks/activity/2026-11.json")!);
		expect(month.entries).toHaveLength(3);
		const renamed = month.entries.find((e: { action: string }) => e.action === "renamed");
		expect(renamed.name).toBe("c.md");
		expect(renamed.meta.oldName).toBe("a.md");
	});

	it("answers range and day-before queries across months and after a restart", async () => {
		const h = fakeFs();
		const first = createFolderActivityStore(h.fs);
		await first.log("f", "a.md", "created", undefined, new Date(2026, 9, 31, 9).getTime());
		await first.log("f", "a.md", "edited", undefined, new Date(2026, 10, 2, 9).getTime());
		const second = createFolderActivityStore(h.fs);
		expect((await second.inRange("2026-10-31", "2026-11-02")).map((r) => r.day)).toEqual(["2026-10-31", "2026-11-02"]);
		expect(await second.dayBefore("2026-11-02")).toBe("2026-10-31");
		expect(await second.dayBefore("2026-10-31")).toBeNull();
	});

	it("keeps a damaged month aside and reports it", async () => {
		const h = fakeFs({ ".dtdtasks/activity/2026-11.json": "nope" });
		const store = createFolderActivityStore(h.fs);
		expect(await store.inRange("2026-11-01", "2026-11-30")).toEqual([]);
		expect((await store.problems())).toHaveLength(1);
		expect([...h.files.keys()].some((k) => k.includes(".damaged-"))).toBe(true);
	});
});

const entry = (id: string, date: string, amount = 10): ExpenseEntry => ({
	id,
	date,
	group: "Food",
	name: id,
	amount,
});

const expensesState = (expenses: ExpenseEntry[]) => ({ expenses, selectedDate: "2026-11-15", loaded: true });

describe("folder finance store", () => {
	it("splits expenses into one file per month and reads them back in order", async () => {
		const h = fakeFs();
		const store = createFolderFinanceStore(h.fs);
		await store.loadExpenses();
		await store.saveExpenses(expensesState([entry("a", "2026-11-02"), entry("b", "2026-10-30"), entry("c", "2026-11-15")]));
		expect([...h.files.keys()].filter((k) => k.startsWith("Finance/expenses/")).sort()).toEqual([
			"Finance/expenses/2026-10.json",
			"Finance/expenses/2026-11.json",
		]);
		const loaded = await createFolderFinanceStore(h.fs).loadExpenses();
		expect(loaded!.expenses.map((e) => e.id)).toEqual(["b", "a", "c"]);
		expect(loaded!.loaded).toBe(true);
	});

	it("an edit in a past month rewrites only that month", async () => {
		const h = fakeFs();
		const store = createFolderFinanceStore(h.fs);
		await store.loadExpenses();
		const all = [entry("a", "2026-11-02"), entry("b", "2026-10-30")];
		await store.saveExpenses(expensesState(all));
		const november = h.files.get("Finance/expenses/2026-11.json");
		const writes: string[] = [];
		const original = h.fs.writeText;
		h.fs.writeText = async (p, c) => {
			writes.push(p);
			return original(p, c);
		};
		await store.saveExpenses(expensesState([all[0], entry("b", "2026-10-30", 99)]));
		expect(writes).toEqual(["Finance/expenses/2026-10.json"]);
		expect(h.files.get("Finance/expenses/2026-11.json")).toBe(november);
	});

	it("moves an emptied month to the recycle bin", async () => {
		const h = fakeFs();
		const store = createFolderFinanceStore(h.fs);
		await store.loadExpenses();
		await store.saveExpenses(expensesState([entry("a", "2026-11-02"), entry("b", "2026-10-30")]));
		await store.saveExpenses(expensesState([entry("a", "2026-11-02")]));
		expect(h.trashed).toEqual(["Finance/expenses/2026-10.json"]);
	});

	it("keeps a damaged month aside, still loads its valid entries, and reports it", async () => {
		const good = entry("ok", "2026-11-02");
		const file = JSON.stringify({ version: 1, expenses: { expenses: [good, { id: "bad" }] } });
		const h = fakeFs({ "Finance/expenses/2026-11.json": file, "Finance/expenses/2026-10.json": "{nope" });
		const store = createFolderFinanceStore(h.fs);
		const loaded = await store.loadExpenses();
		expect(loaded!.expenses.map((e) => e.id)).toEqual(["ok"]);
		expect((await store.problems()).map((p) => p.file).sort()).toEqual(["expenses/2026-10.json", "expenses/2026-11.json"]);
		const copies = [...h.files.entries()].filter(([k]) => k.includes(".damaged-"));
		expect(copies.map(([, v]) => v).sort()).toEqual([file, "{nope"].sort());
	});

	it("round-trips the finance settings through the backup checks", async () => {
		const h = fakeFs();
		const store = createFolderFinanceStore(h.fs);
		expect(await store.loadFinance()).toBeNull();
		const state: FinanceState = {
			salary: { amount: 5000, dayOfMonth: 1 },
			currentBalance: 120,
			manualOverride: false,
			groups: ["Food", "Rent"],
			recurring: [
				{
					id: "r1",
					name: "Rent",
					group: "Rent",
					amount: 900,
					everyMonths: 1,
					dayOfMonth: 1,
					startMonth: "2026-01",
					lastPosted: "2026-11-01",
				},
			],
			loaded: true,
			lastUpdatedDate: "2026-11-15",
		};
		await store.saveFinance(state);
		const back = await createFolderFinanceStore(h.fs).loadFinance();
		expect(back).toMatchObject({
			salary: { amount: 5000, dayOfMonth: 1 },
			groups: ["Food", "Rent"],
			recurring: [{ id: "r1", lastPosted: "2026-11-01" }],
		});
	});

	it("does not rewrite settings that did not change", async () => {
		const h = fakeFs();
		const store = createFolderFinanceStore(h.fs);
		const state = { salary: null, currentBalance: 0, manualOverride: false, groups: ["A"], loaded: true } as FinanceState;
		await store.saveFinance(state);
		const writes = vi.spyOn(h.fs, "writeText");
		await store.saveFinance({ ...state });
		expect(writes).not.toHaveBeenCalled();
	});
});

