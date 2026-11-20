

import { saveFile, savedTo } from "@src/lib/utils/saveFile";
import { ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";
import { formatTimestamp } from "@src/lib/utils/download/shared";














/** JPG has no transparency, so the picture is drawn on white first (it would turn black otherwise). */
const flattenOnWhite = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
	const flat = document.createElement("canvas");
	flat.width = canvas.width;
	flat.height = canvas.height;
	const ctx = flat.getContext("2d");
	if (!ctx) return canvas;
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, flat.width, flat.height);
	ctx.drawImage(canvas, 0, 0);
	return flat;
};
export const handleQRExport = async (
	canvas: HTMLCanvasElement | null,
	showNotification?: ShowNotificationFn,
	format: "png" | "jpg" = "png",
): Promise<void> => {
	if (!canvas) {
		showNotification?.("QR Code not generated yet", "error");
		return;
	}

	try {
		const source = format === "jpg" ? flattenOnWhite(canvas) : canvas;
		const done = (blob: Blob | null) => {
			if (!blob) return;
			saveFile(blob, `qr-code_${formatTimestamp()}.${format}`, "QR").then(
				(saved) => {
					if (saved.cancelled) return;
					showNotification?.(
						`QR Code downloaded successfully${savedTo(saved.path)}`,
						"success",
					);
				},
				() => showNotification?.("Failed to export QR code", "error"),
			);
		};
		if (format === "jpg") source.toBlob(done, "image/jpeg", 0.92);
		else source.toBlob(done);
	} catch (error) {
		console.error("QR export error:", error);
		showNotification?.("Failed to export QR code", "error");
	}
};
