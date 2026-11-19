/** Names that cannot be used as a file or folder name on Windows. */
// eslint-disable-next-line no-control-regex -- control characters are illegal in Windows names
const ILLEGAL =/[<>:"/\\|?*\u0000-\u001f]/g;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const MAX_NAME = 120;

/** Each page keeps its data in its own folder inside the data folder. Notes live here. */
export const NOTES_ROOT = "Notes";

/** Boards live here, one `<name>.board.json` file each. */
export const BOARDS_ROOT = "Boards";

/** Finance: `settings.json` plus one expenses file per month. */
export const FINANCE_ROOT = "Finance";

/** Journal: one file per day, plus the images. */
export const JOURNAL_ROOT = "Journal";

/** Exports the user asked for land here by default. */
export const EXPORTS_ROOT = "Exports";

/** Where "Save as PDF" puts its files, inside the Notes folder. The notes scan skips it. */
export const PDF_FOLDER = "pdf";

/** Folders directly inside the Notes folder that are never notes. */
export const IGNORED_NOTES_FOLDERS: readonly string[] = [PDF_FOLDER];

/**
 * A name that is legal on Windows and is not hidden by the notes scan. The same
 * input always gives the same output, so the app can map a tree name to its
 * disk name at any time without storing the mapping.
 */
export const toSafeName = (name: string): string => {
	let out = name.replace(ILLEGAL, "_").trim().replace(/[. ]+$/g, "");
	// A leading dot would hide the note from the scan.
	if (out.startsWith(".")) out = `_${out}`;
	if (out === "") out = "_";
	const dot = out.indexOf(".");
	if (RESERVED.test(dot === -1 ? out : out.slice(0, dot))) out = `_${out}`;
	if (out.length > MAX_NAME) {
		const ext = out.toLowerCase().endsWith(".md") ? ".md" : "";
		out = out.slice(0, MAX_NAME - ext.length) + ext;
	}
	return out;
};

/** "docs/a:b.md" -> "docs/a_b.md". */
export const toDiskPath = (treePath: string): string =>
	treePath.split("/").map(toSafeName).join("/");

export const isNoteName = (name: string): boolean => name.toLowerCase().endsWith(".md");

/** Dot-files and our own temporary files are never notes. */
export const isHiddenName = (name: string): boolean =>
	name.startsWith(".") || name.endsWith(".tmp");

export const dirName = (path: string): string =>
	path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";

export const baseName = (path: string): string =>
	path.includes("/") ? path.slice(path.lastIndexOf("/") + 1) : path;
