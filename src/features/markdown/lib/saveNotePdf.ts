import type { File } from "@src/features/markdown/type";
import { generateIndividualFilePDF } from "@src/features/markdown/lib/enhancedPDFGenerator";
import type { DesktopApi } from "@src/lib/desktop/types";
import { NOTES_ROOT, PDF_FOLDER, toDiskPath } from "@src/lib/storage/folder/fileNames";

/** Where the PDF of a note goes: Notes/pdf/<same folders>/<name>.pdf. */
export const pdfPathFor = (notePath: string): string =>
	`${NOTES_ROOT}/${PDF_FOLDER}/${toDiskPath(notePath).replace(/\.md$/i, "")}.pdf`;

/** True when this note already has a saved PDF. */
export const pdfExists = async (
	desktop: Pick<DesktopApi, "fs">,
	fullPath: string,
): Promise<boolean> => {
	const target = pdfPathFor(fullPath);
	const dir = target.slice(0, target.lastIndexOf("/"));
	const name = target.slice(target.lastIndexOf("/") + 1).toLowerCase();
	const entries = await desktop.fs.list(dir);
	return entries.some((entry) => entry.name.toLowerCase() === name);
};

/** Writes the PDF of one note into the data folder. Returns the path it wrote to. */
export const saveNotePdf = async (
	desktop: Pick<DesktopApi, "fs">,
	note: Pick<File, "path" | "content">,
	fullPath: string,
): Promise<string> => {
	const doc = generateIndividualFilePDF(note);
	const bytes = new Uint8Array(doc.output("arraybuffer"));
	let binary = "";
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	const target = pdfPathFor(fullPath);
	await desktop.fs.writeBinary(target, btoa(binary));
	return target;
};
