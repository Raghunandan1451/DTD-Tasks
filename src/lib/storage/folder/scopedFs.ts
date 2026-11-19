import type { NotesFs } from "@src/lib/storage/folder/notesIndex";

const inside = (root: string, rel: string) => (rel ? `${root}/${rel}` : root);

/** The same file API, but every path is inside one folder (a page's own folder). */
export const scopedFs = (fs: NotesFs, root: string): NotesFs => ({
	readText: (rel) => fs.readText(inside(root, rel)),
	writeText: (rel, content) => fs.writeText(inside(root, rel), content),
	readBinary: (rel) => fs.readBinary(inside(root, rel)),
	writeBinary: (rel, base64) => fs.writeBinary(inside(root, rel), base64),
	list: (rel) => fs.list(inside(root, rel)),
	mkdir: (rel) => fs.mkdir(inside(root, rel)),
	rename: (from, to) => fs.rename(inside(root, from), inside(root, to)),
	trash: (rel) => fs.trash(inside(root, rel)),
});
