/** The bytes of a Blob as base64 (what the desktop file calls carry). */
export const blobToBase64 = (blob: Blob): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"));
		reader.onload = () => {
			const result = String(reader.result);
			resolve(result.slice(result.indexOf(",") + 1));
		};
		reader.readAsDataURL(blob);
	});
