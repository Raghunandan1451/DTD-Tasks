import { describe, it, vi, expect, beforeEach, type Mock } from "vitest";
import { saveAs } from "file-saver";
import {
	handleFullAppExport,
	handleMarkdownExport,
	handleQRExport,
	handleTimelineExport,
} from "@src/lib/utils/downloadHandler";
import type { TimelineBackup } from "@src/features/home/lib/timelineBackup";
import type { File as MdFile, Folder } from "@src/features/markdown/type";

interface MockFolder {
	file: Mock;
	folder: Mock;
}
interface MockZip extends MockFolder {
	folders: Record<string, MockFolder>;
	generateAsync: Mock;
}

const zips = vi.hoisted(() => [] as unknown[]);

vi.mock("jszip", () => ({
	default: vi.fn().mockImplementation(() => {
		const folders: Record<string, MockFolder> = {};
		const makeFolder = (name: string): MockFolder =>
			(folders[name] ??= { file: vi.fn(), folder: vi.fn(makeFolder) });
		const zip = {
			file: vi.fn(),
			folder: vi.fn(makeFolder),
			folders,
			generateAsync: vi.fn().mockResolvedValue(new Blob(["zip"])),
		};
		zips.push(zip);
		return zip;
	}),
}));

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

vi.mock("jspdf", () => ({ default: vi.fn() }));

vi.mock("@src/features/markdown/lib/enhancedPDFGenerator", () => ({
	generateIndividualFilePDF: vi.fn(() => ({
		output: () => new ArrayBuffer(0),
	})),
}));

const lastZip = () => zips[zips.length - 1] as MockZip;

const readBlob = (blob: Blob): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsText(blob);
	});

const timeline = (overrides: Partial<TimelineBackup> = {}): TimelineBackup => ({
	schemaVersion: 2,
	journal: [{ id: "j1", text: "hello", createdAt: 1 }],
	journalImages: [],
	markdownLog: [],
	...overrides,
});

beforeEach(() => {
	vi.clearAllMocks();
	zips.length = 0;
});

describe("handleQRExport", () => {
	const notify = vi.fn();

	it("shows an error when there is no canvas yet", async () => {
		await handleQRExport(null, notify);
		expect(notify).toHaveBeenCalledWith("QR Code not generated yet", "error");
		expect(saveAs).not.toHaveBeenCalled();
	});

	it("saves the canvas as a png", async () => {
		const png = new Blob(["png"], { type: "image/png" });
		const canvas = {
			toBlob: (done: (blob: Blob | null) => void) => done(png),
		} as unknown as HTMLCanvasElement;

		await handleQRExport(canvas, notify);

		expect(saveAs).toHaveBeenCalledWith(png, expect.stringMatching(/^qr-code_.*\.png$/));
		expect(notify).toHaveBeenCalledWith("QR Code downloaded successfully", "success");
	});

	it("reports a failure to read the canvas", async () => {
		const canvas = {
			toBlob: () => {
				throw new Error("tainted");
			},
		} as unknown as HTMLCanvasElement;

		await handleQRExport(canvas, notify);

		expect(notify).toHaveBeenCalledWith("Failed to export QR code", "error");
	});
});

describe("handleMarkdownExport", () => {
	const notify = vi.fn();

	it("shows an error when there are no files", async () => {
		await handleMarkdownExport([], notify);
		expect(notify).toHaveBeenCalledWith("No files to export", "error");
		expect(saveAs).not.toHaveBeenCalled();
	});

	it("zips the files with a re-importable json and saves it", async () => {
		const files: (MdFile | Folder)[] = [
			{ id: "a", path: "file1.md", type: "file", content: "Hello World" },
			{
				id: "b",
				path: "folder1",
				type: "folder",
				children: [{ id: "c", path: "nested.md", type: "file", content: "Nested" }],
			},
		];

		await handleMarkdownExport(files, notify);

		const zip = lastZip();
		expect(zip.file).toHaveBeenCalledWith("file1.md", "Hello World");
		expect(zip.file).toHaveBeenCalledWith("folder1/nested.md", "Nested");
		const [, json] = zip.file.mock.calls.find(
			([name]) => name === "file-manager-data.json",
		)!;
		expect(JSON.parse(json).files).toHaveLength(2);
		expect(saveAs).toHaveBeenCalledWith(
			expect.any(Blob),
			expect.stringMatching(/^markdown-export_.*\.zip$/),
		);
		expect(notify).toHaveBeenCalledWith("Files exported successfully", "success");
	});
});

describe("handleTimelineExport", () => {
	const notify = vi.fn();

	it("saves the backup as a json file", async () => {
		const backup = timeline();

		await handleTimelineExport(backup, notify);

		const [blob, name] = (saveAs as unknown as Mock).mock.calls[0];
		expect(name).toMatch(/^timeline-backup_.*\.json$/);
		expect(JSON.parse(await readBlob(blob))).toEqual(backup);
		expect(notify).toHaveBeenCalledWith("Timeline exported successfully", "success");
	});
});

describe("handleFullAppExport", () => {
	const notify = vi.fn();

	it("adds the timeline backup to the zip", async () => {
		const backup = timeline();

		await handleFullAppExport({}, notify, backup);

		const folder = lastZip().folders["Timeline"];
		expect(folder.file).toHaveBeenCalledWith(
			"timeline-backup.json",
			JSON.stringify(backup, null, 2),
		);
		expect(saveAs).toHaveBeenCalledWith(
			expect.any(Blob),
			expect.stringMatching(/^list-manager-full-export_.*\.zip$/),
		);
	});

	it("leaves the timeline out when there is nothing in it", async () => {
		await handleFullAppExport(
			{},
			notify,
			timeline({ journal: [], markdownLog: [] }),
		);

		expect(notify).toHaveBeenCalledWith("No data available to export", "error");
		expect(saveAs).not.toHaveBeenCalled();
	});
});
