import { saveAs } from "file-saver";
import { blobToBase64 } from "@src/lib/utils/blobBase64";

export interface SaveResult {
	/** Kept for callers; saving no longer asks, so this is always false. */
	cancelled: boolean;
	/** Where the file went on desktop; null in the browser (the browser decides). */
	path: string | null;
}

/**
 * Saves something the user asked to export. In the browser that is the normal
 * download. On desktop the file is written straight into the data folder
 * (`Exports/`, or `QR/` for QR codes) with no dialog and no download.
 */
export const saveFile = async (
	blob: Blob,
	name: string,
	folder: "Exports" | "QR" = "Exports",
): Promise<SaveResult> => {
	const desktop = typeof window === "undefined" ? undefined : window.desktop;
	if (!desktop) {
		saveAs(blob, name);
		return { cancelled: false, path: null };
	}
	const path = await desktop.shell.saveFile(name, await blobToBase64(blob), folder);
	return { cancelled: false, path };
};

/** " to <data folder>/Exports/name.zip" on desktop, nothing in the browser: for a success message. */
export const savedTo = (path: string | null): string => (path ? ` to ${path}` : "");
