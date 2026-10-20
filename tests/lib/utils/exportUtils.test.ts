import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleQRExport } from "@src/lib/utils/downloadHandler/qrExport";
import { saveAs } from "file-saver";

vi.mock("file-saver", () => ({
	saveAs: vi.fn(),
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

	it("saves the canvas as a PNG", async () => {
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
