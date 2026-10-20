import { beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";

const { readOutputBlobsMock, writeOutputFileMock } = vi.hoisted(() => ({
	readOutputBlobsMock: vi.fn(),
	writeOutputFileMock: vi.fn(async () => undefined),
}));

vi.mock("@src/lib/utils/fileStorage/outputFiles", () => ({
	readOutputBlobs: readOutputBlobsMock,
	writeOutputFile: writeOutputFileMock,
}));

import {
	createOutputArchive,
	getUploadOutputPath,
	isSupportedUpload,
	uploadOutputFiles,
} from "@src/lib/utils/fileStorage/outputTransfer";

describe("output file transfer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("preserves binary file contents and relative paths in the download archive", async () => {
		readOutputBlobsMock.mockImplementation(async (directory: string) =>
			directory === "Expenses"
				? [
						{
							path: "Expenses/2026/10/expenses-2026-10.pdf",
							content: new Blob([new Uint8Array([0, 255, 1])]),
						},
					]
				: [],
		);

		const archiveBlob = await createOutputArchive();
		const archive = await JSZip.loadAsync(archiveBlob!);

		expect(
			await archive.files["Expenses/2026/10/expenses-2026-10.pdf"].async(
				"uint8array",
			),
		).toEqual(new Uint8Array([0, 255, 1]));
	});

	it("creates a table-scoped archive without including other output folders", async () => {
		readOutputBlobsMock.mockImplementation(async (directory: string) =>
			directory === "Events"
				? [
						{
							path: "Events/2026/10/events-2026-10.json",
							content: new Blob(['{"events":[]}']),
						},
					]
				: [],
		);

		const archiveBlob = await createOutputArchive(["Events"]);
		const archive = await JSZip.loadAsync(archiveBlob!);

		expect(readOutputBlobsMock).toHaveBeenCalledTimes(1);
		expect(readOutputBlobsMock).toHaveBeenCalledWith(
			"Events",
			expect.any(Function),
		);
		expect(archive.files["Events/2026/10/events-2026-10.json"]).toBeTruthy();
	});

	it("includes only the requested historical export formats per section", async () => {
		const fixtures: Record<string, Array<{ path: string; content: Blob }>> = {
			Events: [
				{ path: "Events/events-2026.json", content: new Blob(["{}"]) },
				{ path: "Events/calendar-2026.png", content: new Blob(["png"]) },
				{ path: "Events/ignore.pdf", content: new Blob(["pdf"]) },
			],
			Expenses: [
				{ path: "Expenses/expenses.json", content: new Blob(["{}"]) },
				{ path: "Expenses/report.pdf", content: new Blob(["pdf"]) },
				{ path: "Expenses/ignore.png", content: new Blob(["png"]) },
			],
			Markdown: [
				{ path: "Markdown/file.md", content: new Blob(["md"]) },
				{ path: "Markdown/file.pdf", content: new Blob(["pdf"]) },
				{ path: "Markdown/file-manager-data.json", content: new Blob(["{}"]) },
			],
			QR: [
				{ path: "QR/qr-code.png", content: new Blob(["png"]) },
				{ path: "QR/ignore.json", content: new Blob(["{}"]) },
			],
		};
		readOutputBlobsMock.mockImplementation(
			async (
				directory: string,
				isMatchingFile: (name: string) => boolean,
			) =>
				(fixtures[directory] ?? []).filter(({ path }) =>
					isMatchingFile(path.split("/").pop() ?? ""),
				),
		);

		const archiveBlob = await createOutputArchive([
			"Events",
			"Expenses",
			"Markdown",
			"QR",
		]);
		const archive = await JSZip.loadAsync(archiveBlob!);
		const files = Object.keys(archive.files).filter(
			(path) => !archive.files[path].dir,
		);

		expect(files.sort()).toEqual([
			"Events/calendar-2026.png",
			"Events/events-2026.json",
			"Expenses/expenses.json",
			"Expenses/report.pdf",
			"Markdown/file-manager-data.json",
			"Markdown/file.md",
			"Markdown/file.pdf",
			"QR/qr-code.png",
		]);
	});

	it("accepts only supported extensions and uses existing output names", async () => {
		const uploads = [
			new File(["events"], "events-2026-10.json"),
			new File(["expenses"], "expenses-2026-10.pdf"),
			new File(["notes"], "notes.md"),
			new File(["not supported"], "notes.txt"),
		];

		expect(uploads.map((file) => isSupportedUpload(file))).toEqual([
			true,
			true,
			true,
			false,
		]);
		expect(getUploadOutputPath("events-2026-10.json")).toBe(
			"Events/2026/10/events-2026-10.json",
		);
		expect(getUploadOutputPath("expenses-2026-10.pdf")).toBe(
			"Expenses/2026/10/expenses-2026-10.pdf",
		);

		await expect(uploadOutputFiles(uploads)).resolves.toEqual({
			saved: 3,
			skipped: 1,
		});
		expect(writeOutputFileMock.mock.calls.map(([path]) => path)).toEqual([
			"Events/2026/10/events-2026-10.json",
			"Expenses/2026/10/expenses-2026-10.pdf",
			"Markdown/notes.md",
		]);
	});
});
