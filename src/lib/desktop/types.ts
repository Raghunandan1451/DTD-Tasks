/** Shared by the Electron main process, the preload script and the React app. */

export const FORMAT_VERSION = 1;
export const MARKER_DIR = ".aiolists";
export const MARKER_FILE = ".aiolists/meta.json";

export type FolderProblem =
	| "missing"
	| "not-a-folder"
	| "not-readable"
	| "not-writable"
	| "newer-format"
	| "damaged-marker";

/** What the gate shows. `path` is the remembered or picked folder, when there is one. */
export type FolderState =
	| { status: "none" }
	| { status: "ready"; path: string }
	| { status: "needs-confirm"; path: string; reason: "not-empty" }
	| { status: "problem"; path: string; problem: FolderProblem };

export interface DirEntry {
	name: string;
	kind: "file" | "dir";
	size: number;
	modifiedMs: number;
}

/** The only surface the page gets from the desktop shell. */
export interface DesktopApi {
	folder: {
		getState(): Promise<FolderState>;
		/** Opens the native folder dialog. The page never supplies a path. */
		choose(): Promise<FolderState>;
		/** Accepts the folder from the last `choose()` that needed confirmation. */
		confirm(): Promise<FolderState>;
		/** Re-checks the remembered folder (after the user fixed a problem). */
		retry(): Promise<FolderState>;
		/** Forgets the folder so the gate asks again. */
		forget(): Promise<FolderState>;
	};
	fs: {
		readText(rel: string): Promise<string | null>;
		writeText(rel: string, content: string): Promise<void>;
		list(rel: string): Promise<DirEntry[]>;
		mkdir(rel: string): Promise<void>;
		rename(from: string, to: string): Promise<void>;
		trash(rel: string): Promise<void>;
	};
	/** Main asks the page to save everything before the window closes. */
	onBeforeClose(handler: () => Promise<void> | void): () => void;
}

declare global {
	interface Window {
		desktop?: DesktopApi;
	}
}
