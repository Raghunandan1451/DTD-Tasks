import { describe, expect, it } from "vitest";
import type { File, FileState, Folder } from "@src/features/markdown/type";
import { fakeFs } from "./fakeFolderFs";
import { toDiskPath, toSafeName } from "@src/lib/storage/folder/fileNames";
import { createFolderNotesStore } from "@src/lib/storage/folder/folderNotesStore";

const file = (id: string, path: string, content = ""): File => ({ id, path, type: "file", content });
const folder = (id: string, path: string, children: (File | Folder)[] = []): Folder => ({
	id,
	path,
	type: "folder",
	children,
});
const state = (files: (File | Folder)[]): FileState => ({
	files,
	selectedFile: null,
	content: "",
	loaded: true,
});

/** Notes live in the Notes folder: seed files there. */
const inNotes = (seed: Record<string, string>) =>
	Object.fromEntries(Object.entries(seed).map(([k, v]) => [`Notes/${k}`, v]));

describe("file names", () => {
	it("makes Windows-safe names", () => {
		expect(toSafeName("a:b*c?.md")).toBe("a_b_c_.md");
		expect(toSafeName("CON.md")).toBe("_CON.md");
		expect(toSafeName("notes. ")).toBe("notes");
		expect(toSafeName(".hidden.md")).toBe("_.hidden.md");
		expect(toDiskPath("docs/a:b.md")).toBe("docs/a_b.md");
	});
});

describe("folder notes store", () => {
	it("returns null for an empty folder and creates the Notes folder", async () => {
		const h = fakeFs();
		expect(await createFolderNotesStore(h.fs).loadTree()).toBeNull();
		expect(h.dirs.has("Notes")).toBe(true);
	});

	it("reads only .md files, skips hidden names and the pdf folder", async () => {
		const h = fakeFs(
			inNotes({
				"a.md": "A",
				"pic.png": "x",
				".secret.md": "no",
				"docs/b.md": "B",
				"docs/readme.txt": "no",
				"pdf/a.md": "no",
				"empty/x.txt": "no",
			}),
		);
		await h.fs.writeText("boards/c.md", "not a note");
		const tree = await createFolderNotesStore(h.fs).loadTree();
		expect(tree!.files.map((f) => f.path)).toEqual(["docs", "a.md"]);
		expect((tree!.files[0] as Folder).children.map((c) => c.path)).toEqual(["b.md"]);
	});

	it("keeps the notes index outside the Notes folder", async () => {
		const h = fakeFs(inNotes({ "a.md": "A" }));
		await createFolderNotesStore(h.fs).loadTree();
		expect(h.files.has(".dtdtasks/notes-index.json")).toBe(true);
		expect([...h.files.keys()].filter((k) => k.startsWith("Notes/.dtdtasks"))).toEqual([]);
	});

	it("keeps ids across reloads", async () => {
		const { fs } = fakeFs(inNotes({ "a.md": "A", "d/b.md": "B" }));
		const first = await createFolderNotesStore(fs).loadTree();
		const second = await createFolderNotesStore(fs).loadTree();
		expect(second).toEqual(first);
	});

	it("keeps the id of a note renamed outside the app", async () => {
		const h = fakeFs(inNotes({ "a.md": "same text" }));
		const before = (await createFolderNotesStore(h.fs).loadTree())!.files[0];
		await h.fs.rename("Notes/a.md", "Notes/z.md");
		const after = (await createFolderNotesStore(h.fs).loadTree())!.files[0];
		expect(after.id).toBe(before.id);
		expect(after.path).toBe("z.md");
	});

	it("creates, edits, renames, moves and trashes through saves", async () => {
		const h = fakeFs();
		const store = createFolderNotesStore(h.fs);
		await store.loadTree();

		await store.saveTree(state([folder("f", "docs"), file("n", "a.md", "one")]));
		expect(h.files.get("Notes/a.md")).toBe("one");
		expect(h.dirs.has("Notes/docs")).toBe(true);

		await store.saveTree(state([folder("f", "docs"), file("n", "a.md", "two")]));
		expect(h.files.get("Notes/a.md")).toBe("two");

		await store.saveTree(state([folder("f", "docs", [file("n", "b.md", "two")])]));
		expect(h.files.has("Notes/a.md")).toBe(false);
		expect(h.files.get("Notes/docs/b.md")).toBe("two");

		await store.saveTree(state([folder("f", "docs")]));
		expect(h.trashed).toEqual(["Notes/docs/b.md"]);
	});

	it("never trashes files that are not notes when a folder is removed", async () => {
		const h = fakeFs(inNotes({ "d/a.md": "A", "d/keep.png": "img" }));
		const store = createFolderNotesStore(h.fs);
		await store.loadTree();
		await store.saveTree(state([]));
		expect(h.trashed).toEqual(["Notes/d/a.md"]);
		expect(h.files.get("Notes/d/keep.png")).toBe("img");
	});

	it("refuses a case-insensitive name clash instead of overwriting", async () => {
		const h = fakeFs(inNotes({ "Notes.md": "mine" }));
		const store = createFolderNotesStore(h.fs);
		const tree = (await store.loadTree())!;
		await expect(
			store.saveTree(state([...tree.files, file("new", "notes.md", "other")])),
		).rejects.toThrow(/already exists/);
		expect(h.files.get("Notes/Notes.md")).toBe("mine");
	});

	it("keeps the pdf folder name for PDF copies", async () => {
		const h = fakeFs();
		const store = createFolderNotesStore(h.fs);
		await store.loadTree();
		await expect(store.saveTree(state([folder("p", "PDF")]))).rejects.toThrow(/reserved/);
	});

	it("writes a sanitised name for an illegal one", async () => {
		const h = fakeFs();
		const store = createFolderNotesStore(h.fs);
		await store.loadTree();
		await store.saveTree(state([file("n", "a:b.md", "x")]));
		expect(h.files.get("Notes/a_b.md")).toBe("x");
	});
});

describe("notes changed outside the app", () => {
	const setup = async (seed: Record<string, string>) => {
		const h = fakeFs(inNotes(seed));
		const store = createFolderNotesStore(h.fs);
		const tree = (await store.loadTree())!;
		return { h, store, tree };
	};

	it("reports nothing when nothing changed", async () => {
		const { store, tree } = await setup({ "a.md": "A" });
		expect(await store.refresh!(tree)).toBeNull();
	});

	it("loads an edit made on disk", async () => {
		const { h, store, tree } = await setup({ "a.md": "A" });
		h.files.set("Notes/a.md", "edited outside");
		const result = await store.refresh!(tree);
		expect((result!.state.files[0] as File).content).toBe("edited outside");
		expect(result!.state.files[0].id).toBe(tree.files[0].id);
		expect(result!.conflicts).toEqual([]);
		expect(await store.refresh!(result!.state)).toBeNull();
	});

	it("loads notes added and removed on disk", async () => {
		const { h, store, tree } = await setup({ "a.md": "A" });
		h.files.set("Notes/new.md", "N");
		h.files.delete("Notes/a.md");
		const result = await store.refresh!(tree);
		expect(result!.state.files.map((f) => f.path)).toEqual(["new.md"]);
	});

	it("keeps the app's text in a conflict copy when both sides changed", async () => {
		const { h, store, tree } = await setup({ "a.md": "A" });
		const mine = state([{ ...(tree.files[0] as File), content: "typed in app" }]);
		h.files.set("Notes/a.md", "edited outside");
		const result = await store.refresh!(mine);
		expect(result!.conflicts).toHaveLength(1);
		expect(h.files.get(`Notes/${result!.conflicts[0]}`)).toBe("typed in app");
		expect(h.files.get("Notes/a.md")).toBe("edited outside");
		expect(result!.state.files.map((f) => f.path)).toContain(result!.conflicts[0]);
	});

	it("keeps the open note selected when it still exists", async () => {
		const { h, store, tree } = await setup({ "a.md": "A" });
		h.files.set("Notes/a.md", "B");
		const result = await store.refresh!({ ...tree, selectedFile: "a.md", content: "A" });
		expect(result!.state.selectedFile).toBe("a.md");
		expect(result!.state.content).toBe("B");
	});
});
