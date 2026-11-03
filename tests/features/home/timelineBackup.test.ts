import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import {
	base64ToBlob,
	blobToBase64,
	buildTimelineBackup,
	describeTimelineImport,
	importTimelineFile,
	parseTimelineBackup,
	serializeTimeline,
} from "@src/features/home/lib/timelineBackup";
import { getDB, resetDBForTests } from "@src/lib/db/database";
import { logMarkdown } from "@src/lib/db/markdownLogRepo";
import {
	countTimelineData,
	getAllTimelineData,
	mergeTimelineData,
} from "@src/lib/db/timelineBackupRepo";
import type { JournalEntry, MarkdownLogEntry } from "@src/lib/db/types";
import { SCHEMA_VERSION } from "@src/lib/utils/schemaVersion";
import { UploadError } from "@src/lib/utils/uploadError";

// "AQID" is the base64 of the bytes 1, 2, 3.
const IMAGE = { id: "img1", mimeType: "image/png", data: "AQID" };

const note = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({
	id: "j1",
	text: "hello",
	createdAt: 1_760_000_000_000,
	...overrides,
});

const logRow = (overrides: Partial<MarkdownLogEntry> = {}): MarkdownLogEntry => ({
	id: "l1",
	fileId: "f1",
	name: "Notes/Idea.md",
	action: "edited",
	day: "2026-10-27",
	createdAt: 1_760_000_000_000,
	updatedAt: 1_760_000_000_000,
	...overrides,
});

const backup = (extra: Record<string, unknown> = {}) => ({
	schemaVersion: SCHEMA_VERSION,
	journal: [note({ imageId: "img1" })],
	journalImages: [IMAGE],
	markdownLog: [logRow()],
	...extra,
});

// jsdom's File has no text(); browsers do. Only text() is used by the importer.
const fileOf = (content: unknown): File =>
	({
		text: async () =>
			typeof content === "string" ? content : JSON.stringify(content),
	}) as unknown as File;

const errorOf = async (run: () => unknown): Promise<string> => {
	try {
		await run();
	} catch (error) {
		expect(error).toBeInstanceOf(UploadError);
		return (error as Error).message;
	}
	throw new Error("expected an UploadError");
};

const freshDb = async () => {
	await resetDBForTests();
	globalThis.indexedDB = new IDBFactory();
};

beforeEach(freshDb);

describe("base64 images", () => {
	it("round-trips bytes and type", async () => {
		const blob = base64ToBlob("AQID", "image/png");
		expect(blob.type).toBe("image/png");
		expect(blob.size).toBe(3);
		expect(await blobToBase64(blob)).toBe("AQID");
	});
});

// fake-indexeddb clones a stored Blob into a plain {} (real browsers keep it),
// so image bytes are checked on serializeTimeline with real Blobs, and stored
// images are checked by id.
describe("export", () => {
	it("includes notes and markdown activity from the database", async () => {
		const db = await getDB();
		await db.put("journal", note());
		await logMarkdown("f1", "a.md", "edited");

		const out = await buildTimelineBackup();

		expect(out.schemaVersion).toBe(SCHEMA_VERSION);
		expect(out.journal).toEqual([note()]);
		expect(out.markdownLog).toHaveLength(1);
		expect(out.journalImages).toEqual([]);
		await expect(countTimelineData()).resolves.toBe(2);
	});

	it("writes images as base64 with their type", async () => {
		const out = await serializeTimeline({
			journal: [note({ imageId: "img1" })],
			journalImages: [{ id: "img1", blob: base64ToBlob("AQID", "image/png") }],
			markdownLog: [],
		});
		expect(out.journalImages).toEqual([IMAGE]);
	});
});

describe("import", () => {
	it("reproduces notes with images and the markdown log in a fresh profile", async () => {
		const exported = backup();
		const message = await importTimelineFile(fileOf(exported));

		expect(message).toBe("Imported 1 notes, 1 images, 1 activity rows");
		const stored = await getAllTimelineData();
		expect(stored.journal).toEqual(exported.journal);
		expect(stored.markdownLog).toEqual(exported.markdownLog);
		expect(stored.journalImages.map((image) => image.id)).toEqual(["img1"]);
	});

	it("skips duplicates when the same file is imported twice", async () => {
		await importTimelineFile(fileOf(backup()));
		const again = await importTimelineFile(fileOf(backup()));

		expect(again).toBe("Nothing new to import (3 already existed)");
		await expect(countTimelineData()).resolves.toBe(2);
	});

	it("never overwrites an existing note that has the same id", async () => {
		const db = await getDB();
		await db.put("journal", note({ text: "mine" }));

		const message = await importTimelineFile(
			fileOf(backup({ journal: [note({ text: "theirs" })], journalImages: [], markdownLog: [] })),
		);

		expect(message).toBe("Nothing new to import (1 already existed)");
		expect((await db.get("journal", "j1"))?.text).toBe("mine");
	});

	it("dedupes markdown log rows by [fileId, day, action] even with a new id", async () => {
		await logMarkdown("f1", "Notes/Idea.md", "edited", undefined, new Date(2026, 9, 27, 10).getTime());

		const result = await mergeTimelineData(
			parseTimelineBackup({
				markdownLog: [
					logRow({ id: "other-id" }),
					logRow({ id: "l2", action: "renamed" }),
				],
			}),
		);

		expect(result.logSkipped).toBe(1);
		expect(result.logAdded).toBe(1);
	});

	it("merges only what is new into existing data", async () => {
		const db = await getDB();
		await db.put("journal", note());

		const message = await importTimelineFile(
			fileOf({ journal: [note(), note({ id: "j2", text: "new" })] }),
		);

		expect(message).toBe("Imported 1 notes (1 duplicates skipped)");
		await expect(countTimelineData()).resolves.toBe(2);
	});

	it("accepts old backups without schemaVersion and with a subset of sections", async () => {
		const message = await importTimelineFile(
			fileOf({ journal: [note({ text: "old" })] }),
		);
		expect(message).toBe("Imported 1 notes");
	});

	it("allows an image-only note", () => {
		expect(() =>
			parseTimelineBackup(backup({ journal: [note({ text: "", imageId: "img1" })] })),
		).not.toThrow();
	});
});

describe("malformed backups", () => {
	it("rejects text that is not JSON", async () => {
		expect(await errorOf(() => importTimelineFile(fileOf("{oops")))).toBe(
			"That file is not valid JSON",
		);
	});

	it("rejects JSON that is not a Timeline backup", async () => {
		const expected = "This doesn't look like a Timeline backup file";
		expect(await errorOf(() => parseTimelineBackup([]))).toBe(expected);
		expect(await errorOf(() => parseTimelineBackup({ files: [] }))).toBe(expected);
		expect(await errorOf(() => parseTimelineBackup(null))).toBe(expected);
	});

	it("rejects a backup from a newer version of the app", async () => {
		const message = await errorOf(() =>
			parseTimelineBackup(backup({ schemaVersion: SCHEMA_VERSION + 1 })),
		);
		expect(message).toContain("newer version");
	});

	it("names the bad entry and what is wrong with it", async () => {
		const message = await errorOf(() =>
			parseTimelineBackup({
				journal: [note(), { id: "j2", text: "x", createdAt: "yesterday" }],
				markdownLog: [logRow({ day: "27/10/2026" })],
			}),
		);
		expect(message).toContain('Journal entry 2 has an invalid "createdAt"');
		expect(message).toContain("Activity row 1 has an invalid \"day\"");
	});

	it("summarises long problem lists", async () => {
		const bad = Array.from({ length: 5 }, () => ({}));
		const message = await errorOf(() => parseTimelineBackup({ journal: bad }));
		expect(message).toContain("(and 2 more)");
	});

	it("checks moods, tags, actions and image data", async () => {
		const problems = [
			{ journal: [note({ mood: 9 as never })] },
			{ journal: [note({ tags: [1] as never })] },
			{ markdownLog: [logRow({ action: "moved" as never })] },
			{ journalImages: [{ ...IMAGE, data: "not base64!" }] },
			{ journalImages: [{ ...IMAGE, mimeType: "text/html" }] },
			{ journal: "nope" },
		];
		for (const problem of problems) {
			expect(await errorOf(() => parseTimelineBackup(problem))).toMatch(
				/^Backup has invalid data/,
			);
		}
	});

	it("imports nothing when any entry is invalid", async () => {
		await errorOf(() =>
			importTimelineFile(
				fileOf({ journal: [note(), { id: "bad" }], markdownLog: [logRow()] }),
			),
		);
		await expect(countTimelineData()).resolves.toBe(0);
	});
});

describe("describeTimelineImport", () => {
	it("reports an empty backup", () => {
		expect(
			describeTimelineImport({
				journalAdded: 0,
				journalSkipped: 0,
				imagesAdded: 0,
				imagesSkipped: 0,
				logAdded: 0,
				logSkipped: 0,
			}),
		).toBe("The backup was empty");
	});
});
