export interface BaseItem {
	/** Stable identity; survives renames, unlike `path`. */
	id: string;
	path: string;
	type: "file" | "folder";
	fullPath?: string;
	depth?: number;
}

export interface File extends BaseItem {
	type: "file";
	content: string;
}

export interface Folder extends BaseItem {
	type: "folder";
	children: (File | Folder)[];
}
export interface FileState {
	files: (File | Folder)[];
	selectedFile: string | null;
	content: string;
	loaded: boolean;
}
