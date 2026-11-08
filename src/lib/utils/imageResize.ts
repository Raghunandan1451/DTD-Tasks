export const MAX_IMAGE_SIDE = 1280;
export const IMAGE_QUALITY = 0.8;

/** Scales (width, height) down so the longest side is at most maxSide; never upscales. */
export const fitWithin = (
	width: number,
	height: number,
	maxSide: number = MAX_IMAGE_SIDE,
): { width: number; height: number } => {
	const longest = Math.max(width, height);
	if (longest <= maxSide) return { width, height };
	const scale = maxSide / longest;
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
	};
};

/** Re-encodes an image as JPEG with the longest side capped, before it is stored. */
export const resizeImageToJpeg = async (
	file: Blob,
	maxSide: number = MAX_IMAGE_SIDE,
	quality: number = IMAGE_QUALITY,
): Promise<Blob> => {
	const bitmap = await createImageBitmap(file);
	try {
		const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Could not process this image.");
		// JPEG has no alpha: paint white so transparent PNGs do not turn black.
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, width, height);
		context.drawImage(bitmap, 0, 0, width, height);

		return await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(blob) =>
					blob ? resolve(blob) : reject(new Error("Could not process this image.")),
				"image/jpeg",
				quality,
			);
		});
	} finally {
		bitmap.close();
	}
};
