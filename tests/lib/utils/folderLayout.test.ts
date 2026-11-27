import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { FileState } from "@src/features/markdown/type";
import type { ExpenseEntry, FinanceState } from "@src/features/finance/type";
import { buildFolderFiles, isFolderZip, readFolderZip } from "@src/lib/utils/download/folderLayout";

const notes: FileState = {
	files: [
		{ id: "f1", path: "Ideas", type: "folder", children: [{ id: "n1", path: "plan.md", type: "file", content: "# Plan" }] },
		{ id: "n2", path: "todo.md", type: "file", content: "buy milk" },
	],
	selectedFile: null,
	content: "",
	loaded: true,
};

const finance = {
	salary: { amount: 5000, dayOfMonth: 1 },
	currentBalance: 100,
	manualOverride: true,
	groups: ["Food"],
	loaded: true,
} as unknown as FinanceState;

const expense = { id: "e1", date: "2026-11-02", group: "Food", name: "Lunch", amount: 12 } as unknown as ExpenseEntry;

const toZip = async (files: Map<string, string>, prefix = "") => {
	const zip = new JSZip();
	for (const [path, text] of files) zip.file(prefix + path, text);
	return JSZip.loadAsync(await zip.generateAsync({ type: "uint8array" }));
};

describe("data folder layout", () => {
	it("uses the same paths as the desktop data folder", async () => {
		const fs = await buildFolderFiles({
			notes,
			finance,
			expenses: { expenses: [expense], selectedDate: "2026-11-02", loaded: true },
			journal: [{ id: "j1", text: "hi", createdAt: new Date(2026, 10, 15, 9).getTime() }],
		});
		const paths = [...fs.files.keys()];
		expect(paths).toEqual(
			expect.arrayContaining([
				".dtdtasks/meta.json",
				"Notes/Ideas/plan.md",
				"Notes/todo.md",
				"Finance/settings.json",
				"Finance/expenses/2026-11.json",
				"Journal/2026/2026-11-15.json",
			]),
		);
		expect(JSON.parse(fs.files.get(".dtdtasks/meta.json")!).app).toBe("DTDTasks");
	});

	it("reads its own ZIP back, also when the folder itself was zipped", async () => {
		const fs = await buildFolderFiles({
			notes,
			finance,
			expenses: { expenses: [expense], selectedDate: "2026-11-02", loaded: true },
			journal: [{ id: "j1", text: "hi", createdAt: new Date(2026, 10, 15, 9).getTime() }],
		});
		for (const prefix of ["", "My Data/"]) {
			const zip = await toZip(fs.files, prefix);
			expect(isFolderZip(zip)).toBe(true);
			const data = await readFolderZip(zip);
			expect(data.notes?.files.map((f) => f.path).sort()).toEqual(["Ideas", "todo.md"]);
			expect(data.finance?.salary?.amount).toBe(5000);
			expect(data.expenses?.expenses.map((e) => e.id)).toEqual(["e1"]);
			expect(data.journal?.map((e) => e.text)).toEqual(["hi"]);
		}
	});

	it("does not mistake an old-style backup ZIP for a data folder", async () => {
		const zip = await toZip(new Map([["Finance/finance-backup.json", "{}"], ["Markdown/file-manager-data.json", "{}"]]));
		expect(isFolderZip(zip)).toBe(false);
	});
});
