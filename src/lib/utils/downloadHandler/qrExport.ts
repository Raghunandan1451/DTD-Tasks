import { saveAs } from "file-saver";
import type { ShowNotificationFn } from "@src/lib/types/notification";
import { usesOPFSOutputStorage } from "@src/lib/utils/fileStorage/outputDirectory";
import { writeOutputFile } from "@src/lib/utils/fileStorage/outputFiles";

const formatTimestamp = (): string =>
	new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);

export const canvasToPNGBlob = (
	canvas: HTMLCanvasElement,
): Promise<Blob> =>
	new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob);
			else reject(new Error("Unable to create the QR image."));
		}, "image/png");
	});

export const handleQRExport = async (
	canvas: HTMLCanvasElement | null,
	showNotification?: ShowNotificationFn,
): Promise<void> => {
	if (!canvas) {
		showNotification?.("QR Code not generated yet", "error");
		return;
	}

	try {
		const blob = await canvasToPNGBlob(canvas);
		const fileName = `qr-code_${formatTimestamp()}.png`;
		saveAs(blob, fileName);
		if (usesOPFSOutputStorage()) {
			try {
				await writeOutputFile("QR/qr-code.png", blob);
			} catch (error) {
				console.error("Unable to save QR image for Home export:", error);
				showNotification?.(
					"QR image downloaded, but could not be saved for Home export.",
					"error",
				);
				return;
			}
		}
		showNotification?.("QR Code downloaded successfully", "success");
	} catch (error) {
		console.error("QR export error:", error);
		showNotification?.("Failed to export QR code", "error");
	}
};
