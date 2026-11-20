import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDBForTests } from "@src/lib/db/database";
import { resetStorage, setStorage } from "@src/lib/storage";
import { createMemoryBoardsStore } from "@src/lib/storage/memoryStorage";
import { createFolderActivityStore } from "@src/lib/storage/folder/folderActivityStore";
import { createFolderFinanceStore } from "@src/lib/storage/folder/folderFinanceStore";
import { createFolderJournalStore } from "@src/lib/storage/folder/folderJournalStore";
import { createFolderNotesStore } from "@src/lib/storage/folder/folderNotesStore";
import { createFolderTimelineStore } from "@src/lib/storage/folder/folderTimelineStore";
import { importBrowserBackup } from "@src/features/desktop/importBrowserBackup";
import { mergeImportedNotes, parseNotesBackup } from "@src/features/markdown/lib/mergeNotes";
import type { File as Note, Folder } from "@src/features/markdown/type";
import { fakeFs } from "../../lib/storage/fakeFolderFs";

const note = (path: string, content: string): Note => ({ id: path, path, type: "file", content });
const folder = (path: string, children: (Note | Folder)[]): Folder => ({ id: path, path, type: "folder", children });

describe("merging imported notes", () => {
	it("adds new notes, skips identical ones, renames clashes, and merges folders", () => {
		const existing = [note("a.md", "same"), note("b.md", "mine"), folder("docs", [note("x.md", "x")])];
		const incoming = parseNotesBackup({
			files: [
				{ type: "file", path: "a.md", content: "same" },
				{ type: "file", path: "B.md", content: "theirs" },
				{ type: "file", path: "c", content: "no suffix" },
				{ type: "folder", path: "docs", children: [{ type: "file", path: "y.md", content: "y" }] },
			],
		});
		const result = mergeImportedNotes(existing, incoming);
		expect(result).toMatchObject({ added: 3, renamed: 1, skipped: 1 });
		const names = result.files.map((f) => f.path);
		expect(names).toEqual(["a.md", "b.md", "docs", "B (2).md", "c.md"]);
		const docs = result.files.find((f) => f.path === "docs") as Folder;
		expect(docs.children.map((c) => c.path)).toEqual(["x.md", "y.md"]);
		expect(result.files.find((f) => f.path === "b.md")).toMatchObject({ content: "mine" });
	});

	it("gives imported items new ids and rejects a bad file", () => {
		const parsed = parseNotesBackup({ files: [{ type: "file", id: "old", path: "a.md", content: "x" }] });
		expect(parsed[0].id).not.toBe("old");
		expect(() => parseNotesBackup({ files: [{ type: "file", path: "a.md" }] })).toThrow();
		expect(() => parseNotesBackup({ nope: true })).toThrow();
	});
});

describe("importing a browser backup into the folder", () => {
	let h: ReturnType<typeof fakeFs>;

	beforeEach(async () => {
		await resetDBForTests();
		globalThis.indexedDB = new IDBFactory();
		h = fakeFs();
		const journal = createFolderJournalStore(h.fs);
		const activity = createFolderActivityStore(h.fs);
		setStorage({
			notes: createFolderNotesStore(h.fs),
			boards: createMemoryBoardsStore(),
			journal,
			activity,
			finance: createFolderFinanceStore(h.fs),
			timeline: createFolderTimelineStore(journal, activity),
		});
	});
	afterEach(() => resetStorage());

	const jsonFile = (name: string, value: unknown) => new File([JSON.stringify(value)], name, { type: "application/json" });

	it("detects each kind of file from its content and restores it", async () => {
		const day = new Date(2026, 4, 3, 10).getTime();
		const report = await importBrowserBackup([
			jsonFile("anything.json", { schemaVersion: 1, journal: [{ id: "j1", text: "old note", createdAt: day }], journalImages: [], markdownLog: [] }),
			jsonFile("whatever.json", {
				schemaVersion: 1,
				boards: [{ id: "b1", name: "Plans", nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 }, createdAt: 1, updatedAt: 1 }],
			}),
		]);
		expect(report.problems).toEqual([]);
		expect(report.done.join(" | ")).toMatch(/Boards: Imported 1 board/);
		expect(report.done.join(" | ")).toMatch(/1 notes/);
		expect(h.files.has("Journal/2026/2026-05-03.json")).toBe(true);
		// Importing the same file again adds nothing.
		const again = await importBrowserBackup([
			jsonFile("anything.json", { schemaVersion: 1, journal: [{ id: "j1", text: "old note", createdAt: day }], journalImages: [], markdownLog: [] }),
		]);
		expect(again.done.join(" ")).toMatch(/Nothing new/);
	});

	it("reads the files inside a ZIP and reports ones it cannot use", async () => {
		const zip = new JSZip();
		zip.file("Markdown/file-manager-data.json", JSON.stringify({ files: [{ type: "file", path: "from-zip.md", content: "hi" }] }));
		zip.file("meta.json", "{}");
		const blob = await zip.generateAsync({ type: "uint8array" });
		const good = new File([blob], "full-export.zip", { type: "application/zip" });
		const bad = jsonFile("random.json", { hello: "world" });
		const report = await importBrowserBackup([good, bad]);
		expect(report.done.join(" ")).toMatch(/Notes: added 1/);
		expect(report.problems.join(" ")).toMatch(/random.json/);
	});

	it("imports finance without replacing settings the folder already has", async () => {
		const backup = {
			version: 1,
			finance: { salary: { amount: 100, dayOfMonth: 1 }, currentBalance: 5, manualOverride: false, groups: ["Food"], loaded: true },
			expenses: { expenses: [{ id: "e1", date: "2026-05-03", group: "Food", name: "Tea", amount: 3 }] },
		};
		const first = await importBrowserBackup([jsonFile("finance-backup.json", backup)]);
		expect(first.done.join(" ")).toMatch(/1 expenses added/);
		expect(first.done.join(" ")).toMatch(/settings imported/);
		const second = await importBrowserBackup([jsonFile("finance-backup.json", backup)]);
		expect(second.done.join(" ")).toMatch(/0 expenses added \(1 already there\)/);
		expect(second.done.join(" ")).toMatch(/kept as they are/);
	});
});
