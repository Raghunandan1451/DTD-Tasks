import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDB, resetDBForTests } from "@src/lib/db/database";
import {
	addJournalEntry,
	deleteJournalEntry,
	getJournalInRange,
	getJournalOnThisDay,
	updateJournalEntry,
} from "@src/lib/db/journalRepo";
import {
	deleteJournalImage,
	getJournalImage,
	putJournalImage,
} from "@src/lib/db/journalImagesRepo";
import { getMarkdownLogInRange, logMarkdown } from "@src/lib/db/markdownLogRepo";
import { fitWithin } from "@src/lib/utils/imageResize";

const at = (y: number, m: number, d: number, h = 12) =>
	new Date(y, m - 1, d, h).getTime();

beforeEach(async () => {
	await resetDBForTests();
	globalThis.indexedDB = new IDBFactory();
});

describe("v3 schema", () => {
	it("creates the timeline stores and indexes", async () => {
		const db = await getDB();
		expect([...db.objectStoreNames].sort()).toEqual([
			"boards",
			"data",
			"journal",
			"journalImages",
			"markdownLog",
		]);
		const tx = db.transaction(["journal", "markdownLog"]);
		expect([...tx.objectStore("journal").indexNames]).toEqual(["createdAt"]);
		expect([...tx.objectStore("markdownLog").indexNames].sort()).toEqual([
			"day",
			"fileId_day_action",
		]);
	});
});

describe("journal", () => {
	it("stamps notes with now and normalizes input", async () => {
		const before = Date.now();
		const entry = await addJournalEntry({
			text: "  hello  ",
			mood: 4,
			tags: [" Work ", "work", "", "home"],
		});
		expect(entry.createdAt).toBeGreaterThanOrEqual(before);
		expect(entry).toMatchObject({ text: "hello", mood: 4, tags: ["Work", "home"] });
	});

	it("rejects empty, oversized and invalid notes", async () => {
		await expect(addJournalEntry({ text: "   " })).rejects.toThrow("Write something");
		await expect(addJournalEntry({ text: "x".repeat(1001) })).rejects.toThrow("1000");
		await expect(
			addJournalEntry({ text: "a", mood: 9 as never }),
		).rejects.toThrow("Mood");
	});

	it("edits text, mood and tags but never createdAt", async () => {
		const entry = await addJournalEntry({ text: "a", mood: 2, tags: ["x"] });
		const updated = await updateJournalEntry(entry.id, {
			text: "b",
			mood: null,
			tags: [],
			...({ createdAt: 1 } as object),
		});
		expect(updated.text).toBe("b");
		expect(updated.mood).toBeUndefined();
		expect(updated.tags).toBeUndefined();
		expect(updated.createdAt).toBe(entry.createdAt);
		expect(updated.updatedAt).toBeDefined();
	});

	it("deletes the attached image with the note", async () => {
		const imageId = await putJournalImage(new Blob(["img"]));
		const entry = await addJournalEntry({ text: "pic", imageId });
		await deleteJournalEntry(entry.id);
		expect(await getJournalImage(imageId)).toBeNull();
		expect(await getJournalInRange(0, Date.now() + 1000)).toEqual([]);
	});

	it("queries a half-open range, newest first", async () => {
		const db = await getDB();
		for (const [id, createdAt] of [["a", 100], ["b", 200], ["c", 300]] as const) {
			await db.put("journal", { id, text: id, createdAt });
		}
		const found = await getJournalInRange(100, 300);
		expect(found.map((e) => e.id)).toEqual(["b", "a"]);
	});

	it("finds notes from the same date in earlier years only", async () => {
		const db = await getDB();
		const rows = [
			["2024", at(2024, 10, 27)],
			["2025", at(2025, 10, 27, 23)],
			["other-day", at(2025, 10, 28)],
			["this-year", at(2026, 10, 27)],
		] as const;
		for (const [id, createdAt] of rows) {
			await db.put("journal", { id, text: id, createdAt });
		}
		const found = await getJournalOnThisDay(new Date(2026, 9, 27, 9));
		expect(found.map((e) => e.id)).toEqual(["2025", "2024"]);
	});

	it("returns nothing on this day for an empty journal", async () => {
		expect(await getJournalOnThisDay(new Date(2026, 9, 27))).toEqual([]);
	});
});

describe("journal images", () => {
	it("stores, reads and deletes a blob", async () => {
		const id = await putJournalImage(new Blob(["abc"], { type: "image/jpeg" }));
		// fake-indexeddb clones jsdom Blobs into plain objects, so only presence
		// is asserted here; real browsers store the Blob itself.
		expect(await getJournalImage(id)).not.toBeNull();
		await deleteJournalImage(id);
		expect(await getJournalImage(id)).toBeNull();
	});

	it("scales the longest side down and never upscales", () => {
		expect(fitWithin(4000, 2000)).toEqual({ width: 1280, height: 640 });
		expect(fitWithin(1000, 3000)).toEqual({ width: 427, height: 1280 });
		expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
	});
});

describe("logMarkdown", () => {
	const day = (y: number, m: number, d: number) =>
		`${y}-${`${m}`.padStart(2, "0")}-${`${d}`.padStart(2, "0")}`;

	it("collapses ten saves in a day into one edited row", async () => {
		for (let i = 0; i < 10; i++) {
			await logMarkdown("f1", "Notes/Idea.md", "edited", undefined, at(2026, 10, 27, 9) + i);
		}
		const rows = await getMarkdownLogInRange("2026-10-27", "2026-10-27");
		expect(rows).toHaveLength(1);
		expect(rows[0].updatedAt).toBe(at(2026, 10, 27, 9) + 9);
		expect(rows[0].createdAt).toBe(at(2026, 10, 27, 9));
	});

	it("keeps one edited row per day", async () => {
		await logMarkdown("f1", "a.md", "edited", undefined, at(2026, 10, 27));
		await logMarkdown("f1", "a.md", "edited", undefined, at(2026, 10, 28));
		expect(await getMarkdownLogInRange("2026-10-27", "2026-10-28")).toHaveLength(2);
	});

	it("keeps rename and delete rows with their name snapshots", async () => {
		const t = at(2026, 10, 27);
		await logMarkdown("f1", "Idea.md", "created", undefined, t);
		await logMarkdown("f1", "Plan.md", "renamed", { oldName: "Idea.md" }, t + 1);
		await logMarkdown("f1", "Plan.md", "deleted", undefined, t + 2);
		const rows = await getMarkdownLogInRange("2026-10-27", "2026-10-27");
		expect(rows.map((r) => [r.action, r.name]).sort()).toEqual([
			["created", "Idea.md"],
			["deleted", "Plan.md"],
			["renamed", "Plan.md"],
		]);
		expect(rows.find((r) => r.action === "renamed")?.meta?.oldName).toBe("Idea.md");
	});

	it("merges repeated renames, keeping the first oldName", async () => {
		const t = at(2026, 10, 27);
		await logMarkdown("f1", "b.md", "renamed", { oldName: "a.md" }, t);
		await logMarkdown("f1", "c.md", "renamed", { oldName: "b.md" }, t + 1);
		const rows = await getMarkdownLogInRange("2026-10-27", "2026-10-27");
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ name: "c.md", meta: { oldName: "a.md" } });
	});

	it("files an 11:30 PM IST edit under the local day", async () => {
		await logMarkdown("f1", "a.md", "edited", undefined, new Date(2026, 9, 27, 23, 30).getTime());
		expect((await getMarkdownLogInRange(day(2026, 10, 27), day(2026, 10, 27)))).toHaveLength(1);
		expect((await getMarkdownLogInRange(day(2026, 10, 28), day(2026, 10, 28)))).toHaveLength(0);
	});

	it("never throws when the write fails", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const db = await getDB();
		vi.spyOn(db, "transaction").mockImplementation(() => {
			throw new Error("quota exceeded");
		});
		await expect(logMarkdown("f1", "a.md", "edited")).resolves.toBeUndefined();
		expect(warn).toHaveBeenCalled();
		vi.restoreAllMocks();
	});
});
