import { beforeEach, describe, expect, it, vi } from "vitest";
import type { File, Folder } from "@src/features/markdown/type";
import { handleMarkdownExport } from "@src/lib/utils/downloadHandler/markdownExport";
import { handleQRExport } from "@src/lib/utils/downloadHandler/qrExport";
import { generateIndividualFilePDF } from "@src/features/markdown/lib/enhancedPDFGenerator";
import { saveAs } from "file-saver";

const { zipFile, pdfFile, zipFolder, generateZip, pdfOutput } = vi.hoisted(
	() => ({
		zipFile: vi.fn(),
		pdfFile: vi.fn(),
		zipFolder: vi.fn(),
		generateZip: vi.fn(),
		pdfOutput: vi.fn(),
	}),
);

vi.mock("jszip", () => ({
	default: vi.fn(() => ({
		file: zipFile,
		folder: zipFolder,
		generateAsync: generateZip,
	})),
}));

vi.mock("file-saver", () => ({
	saveAs: vi.fn(),
}));

vi.mock("@src/features/markdown/lib/enhancedPDFGenerator", () => ({
	generateIndividualFilePDF: vi.fn(() => ({ output: pdfOutput })),
}));

describe("handleQRExport", () => {
	const showNotification = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("notifies when there is no QR canvas", async () => {
		await handleQRExport(null, showNotification);

		expect(showNotification).toHaveBeenCalledWith(
			"QR Code not generated yet",
			"error",
		);
		expect(saveAs).not.toHaveBeenCalled();
	});

	it("saves the canvas PNG", async () => {
		const image = new Blob(["qr image"], { type: "image/png" });
		const canvas = {
			toBlob: vi.fn((callback: BlobCallback) => callback(image)),
		} as unknown as HTMLCanvasElement;

		await handleQRExport(canvas, showNotification);

		expect(saveAs).toHaveBeenCalledWith(
			image,
			expect.stringMatching(/^qr-code_.+\.png$/),
		);
		expect(showNotification).toHaveBeenCalledWith(
			"QR Code downloaded successfully",
			"success",
		);
	});
});

describe("handleMarkdownExport", () => {
	const showNotification = vi.fn();
	const pdfDirectory = { file: pdfFile };

	beforeEach(() => {
		vi.clearAllMocks();
		zipFolder.mockReturnValue(pdfDirectory);
		generateZip.mockResolvedValue(new Blob(["archive"]));
		pdfOutput.mockReturnValue("pdf-buffer");
	});

	it("notifies when there are no Markdown files", async () => {
		await handleMarkdownExport([], showNotification);

		expect(showNotification).toHaveBeenCalledWith(
			"No files to export",
			"error",
		);
		expect(saveAs).not.toHaveBeenCalled();
	});

	it("exports Markdown files and their generated PDFs", async () => {
		const files: (File | Folder)[] = [
			{
				path: "notes",
				type: "folder",
				children: [
					{ path: "meeting.md", type: "file", content: "# Meeting" },
				],
			},
		];

		await handleMarkdownExport(files, showNotification);

		expect(zipFolder).toHaveBeenCalledWith("PDF");
		expect(zipFolder).toHaveBeenCalledWith("notes");
		expect(zipFile).toHaveBeenCalledWith("notes/meeting.md", "# Meeting");
		expect(generateIndividualFilePDF).toHaveBeenCalledWith({
			path: "meeting.md",
			type: "file",
			content: "# Meeting",
		});
		expect(pdfFile).toHaveBeenCalledWith(
			"notes/meeting.pdf",
			"pdf-buffer",
		);
		expect(generateZip).toHaveBeenCalledWith({ type: "blob" });
		expect(saveAs).toHaveBeenCalledWith(
			expect.any(Blob),
			expect.stringMatching(/^markdown-export_.+\.zip$/),
		);
		expect(showNotification).toHaveBeenCalledWith(
			"Files exported successfully",
			"success",
		);
	});
});
