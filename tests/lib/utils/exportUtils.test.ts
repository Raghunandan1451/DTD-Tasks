import { describe, it, vi, expect, beforeEach, Mock } from "vitest";
import {
	handleDownloadPDF,
	handleDownloadImage,
	handleZIPExport,
	FileTree,
} from "@src/lib/utils/downloadHandler";

import jsPDF from "jspdf";
import { saveAs } from "file-saver";

vi.mock("jspdf", () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			setFontSize: vi.fn(),
			text: vi.fn(),
			rect: vi.fn(),
			addPage: vi.fn(),
			save: vi.fn(),
		})),
	};
});

vi.mock("jszip", () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			folder: vi.fn(),
			file: vi.fn(),
			generateAsync: vi
				.fn()
				.mockResolvedValue(
					new Blob(["test"], { type: "application/zip" })
				),
		})),
	};
});

vi.mock("file-saver", () => ({
	saveAs: vi.fn(),
}));

describe("handleDownloadPDF", () => {
	const mockShowNotification = vi.fn();

	const data = [
		{ uid: "1", name: "Alice", age: "25" },
		{ uid: "2", name: "", age: "" },
	];

	const columns = [
		{ key: "name", header: "Name", type: "string" },
		{ key: "age", header: "Age", type: "number" },
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should show error if all rows are empty", () => {
		handleDownloadPDF(
			[{ uid: "", name: "", age: "" }],
			columns,
			"Test Title",
			mockShowNotification
		);
		expect(mockShowNotification).toHaveBeenCalledWith(
			"No non-empty rows available to download.",
			"error"
		);
	});

	it("should generate and save PDF when data is valid", () => {
		handleDownloadPDF(data, columns, "Test Title", mockShowNotification);
		expect(jsPDF).toHaveBeenCalled();
		const mockInstance = (jsPDF as unknown as Mock).mock.results[0].value;
		expect(mockInstance.save).toHaveBeenCalledWith("Test Title.pdf");
	});
});

describe("handleDownloadImage", () => {
	const mockShowNotification = vi.fn();

	it("should show error if no QR data", () => {
		handleDownloadImage("", null, mockShowNotification);
		expect(mockShowNotification).toHaveBeenCalledWith(
			"Please generate a QR code before downloading!",
			"error"
		);
	});

	it("should trigger image download if QR data and canvas are present", () => {
		const mockCanvas = {
			toDataURL: vi
				.fn()
				.mockReturnValue("data:image/png;base64,someimage"),
		} as unknown as HTMLCanvasElement;

		const clickSpy = vi
			.spyOn(document, "createElement")
			.mockImplementation(() => {
				return {
					click: vi.fn(),
					set href(value: string) {},
					set download(value: string) {},
				} as unknown as HTMLAnchorElement;
			});

		handleDownloadImage("some data", mockCanvas, mockShowNotification);
		expect(clickSpy).toHaveBeenCalledWith("a");
	});
});

describe("handleZIPExport", () => {
	const mockShowNotification = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should show error if no files provided", async () => {
		await handleZIPExport([], mockShowNotification);
		expect(mockShowNotification).toHaveBeenCalledWith(
			"No Files created",
			"error"
		);
	});

	it("should generate and save zip when files are valid", async () => {
		const files = [
			{ path: "file1.txt", type: "file", content: "Hello World" },
			{
				path: "folder1",
				type: "folder",
				children: [
					{ path: "nested.txt", type: "file", content: "Nested" },
				],
			},
		] as FileTree[];

		const result = await handleZIPExport(files, mockShowNotification);
		expect(result).toBe(true);
		expect(saveAs).toHaveBeenCalled();
	});
});
