import { saveAs } from "file-saver";
import type { ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";
import { formatTimestamp } from "./common";

export const handleQRExport = async (
	canvas: HTMLCanvasElement | null,
	showNotification?: ShowNotificationFn,
): Promise<void> => {
	if (!canvas) {
		showNotification?.("QR Code not generated yet", "error");
		return;
	}

	try {
		canvas.toBlob((blob) => {
			if (blob) {
				saveAs(blob, `qr-code_${formatTimestamp()}.png`);
				showNotification?.(
					"QR Code downloaded successfully",
					"success",
				);
			}
		});
	} catch (error) {
		console.error("QR export error:", error);
		showNotification?.("Failed to export QR code", "error");
	}
};
