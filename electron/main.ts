import {
	BrowserWindow,
	Menu,
	app,
	dialog,
	ipcMain,
	net,
	protocol,
	shell,
	type IpcMainInvokeEvent,
} from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promises as fs } from "node:fs";
import type { FolderState } from "@src/lib/desktop/types";
import { readConfig, writeConfig } from "@shell/appConfig";
import {
	folderToOpen,
	inspectFolder,
	listDir,
	makeDir,
	prepareFolder,
	atomicWrite,
	readBinary,
	readText,
	renamePath,
	trashPath,
	writeBinary,
	writeText,
} from "@shell/folderService";

const SCHEME = "app";
const HOST = "aiolists";
const ORIGIN = `${SCHEME}://${HOST}`;
// `yarn desktop:dev` points this at the Vite dev server.
const DEV_URL = app.isPackaged ? undefined : process.env.AIOLISTS_DEV_URL;
const DIST = path.join(__dirname, "..", "dist-desktop");
const FLUSH_TIMEOUT_MS = 4000;

// Test-only switches. A packaged app ignores them.
if (!app.isPackaged && process.env.AIOLISTS_USER_DATA) {
	app.setPath("userData", process.env.AIOLISTS_USER_DATA);
}
const testSaveDir = app.isPackaged ? undefined : process.env.AIOLISTS_TEST_SAVE_DIR;
const testPick = app.isPackaged ? undefined : process.env.AIOLISTS_TEST_PICK_FOLDER;

protocol.registerSchemesAsPrivileged([
	{
		scheme: SCHEME,
		privileges: { standard: true, secure: true, supportFetchAPI: true },
	},
]);

let root: string | null = null;
/** A folder the user picked that still needs a yes from them. */
let pending: string | null = null;
let mainWindow: BrowserWindow | null = null;

const configDir = () => app.getPath("userData");

async function stateFor(candidate: string): Promise<FolderState> {
	const result = await inspectFolder(candidate);
	if (result.kind === "ok") {
		root = candidate;
		return { status: "ready", path: candidate };
	}
	root = null;
	if (result.kind === "problem") {
		return { status: "problem", path: candidate, problem: result.problem };
	}
	if (result.kind === "not-empty") {
		pending = candidate;
		return { status: "needs-confirm", path: candidate, reason: "not-empty" };
	}
	// Empty folder: safe to claim without asking.
	await prepareFolder(candidate);
	return acceptFolder(candidate);
}

async function acceptFolder(candidate: string): Promise<FolderState> {
	const result = await inspectFolder(candidate);
	if (result.kind !== "ok") {
		return {
			status: "problem",
			path: candidate,
			problem: result.kind === "problem" ? result.problem : "damaged-marker",
		};
	}
	root = candidate;
	pending = null;
	await writeConfig(configDir(), { dataFolder: candidate });
	return { status: "ready", path: candidate };
}

async function currentState(): Promise<FolderState> {
	const { dataFolder } = await readConfig(configDir());
	if (!dataFolder) return { status: "none" };
	const result = await inspectFolder(dataFolder);
	if (result.kind === "ok") {
		root = dataFolder;
		return { status: "ready", path: dataFolder };
	}
	root = null;
	if (result.kind === "problem") {
		return { status: "problem", path: dataFolder, problem: result.problem };
	}
	// The marker was removed from a folder we remembered: ask again, never recreate silently.
	return { status: "problem", path: dataFolder, problem: "damaged-marker" };
}

function trustedSender(event: IpcMainInvokeEvent): boolean {
	const url = event.senderFrame?.url ?? "";
	return url.startsWith(`${ORIGIN}/`) || (!!DEV_URL && url.startsWith(DEV_URL));
}

function handle<T>(
	channel: string,
	fn: (...args: any[]) => Promise<T> | T, // eslint-disable-line @typescript-eslint/no-explicit-any
) {
	ipcMain.handle(channel, (event, ...args) => {
		if (!trustedSender(event)) throw new Error("Untrusted caller");
		return fn(...args);
	});
}

function needRoot(): string {
	if (!root) throw new Error("No data folder is set");
	return root;
}

function registerIpc() {
	handle("folder:getState", currentState);

	handle("folder:choose", async () => {
		let picked: string | undefined = testPick;
		if (!picked) {
			const options: Electron.OpenDialogOptions = {
				title: "Choose your AIOLists folder",
				properties: ["openDirectory", "createDirectory"],
			};
			const result = mainWindow
				? await dialog.showOpenDialog(mainWindow, options)
				: await dialog.showOpenDialog(options);
			picked = result.canceled ? undefined : result.filePaths[0];
		}
		if (!picked) return currentState();
		return stateFor(picked);
	});

	handle("folder:confirm", async () => {
		if (!pending) return currentState();
		const candidate = pending;
		const result = await inspectFolder(candidate);
		if (result.kind === "problem") {
			return { status: "problem", path: candidate, problem: result.problem };
		}
		await prepareFolder(candidate);
		return acceptFolder(candidate);
	});

	handle("folder:retry", currentState);

	handle("folder:forget", async () => {
		root = null;
		pending = null;
		await writeConfig(configDir(), {});
		return { status: "none" } satisfies FolderState;
	});

	handle("fs:readText", (rel: string) => readText(needRoot(), rel));
	handle("fs:writeText", (rel: string, content: string) =>
		writeText(needRoot(), rel, String(content)),
	);
	handle("fs:readBinary", (rel: string) => readBinary(needRoot(), rel));
	handle("fs:writeBinary", (rel: string, base64: string) =>
		writeBinary(needRoot(), rel, String(base64)),
	);
	// Exports are written straight into the data folder (no Save dialog): Exports/ or QR/.
	handle("shell:saveFile", async (name: string, base64: string, folder?: string) => {
		const dataRoot = needRoot();
		const fileName = [...path.basename(String(name))].map((c) => (c.charCodeAt(0) < 32 || '<>:"/|?*\\'.includes(c) ? "_" : c)).join("") || "export";
		const sub = folder === "QR" ? "QR" : "Exports";
		const dir = testSaveDir ?? (await folderToOpen(dataRoot, sub));
		if (testSaveDir) await fs.mkdir(dir, { recursive: true });
		const ext = path.extname(fileName);
		const stem = fileName.slice(0, fileName.length - ext.length);
		let target = path.join(dir, fileName);
		for (let n = 2; await fs.stat(target).then(() => true, () => false); n++) {
			target = path.join(dir, `${stem} (${n})${ext}`);
		}
		await atomicWrite(target, Buffer.from(String(base64), "base64"));
		return target;
	});
	handle("shell:openFolder", async (rel: string) => {
		const target = await folderToOpen(needRoot(), String(rel ?? ""));
		const error = await shell.openPath(target);
		if (error) throw new Error(error);
	});
	handle("fs:list", (rel: string) => listDir(needRoot(), rel));
	handle("fs:mkdir", (rel: string) => makeDir(needRoot(), rel));
	handle("fs:rename", (from: string, to: string) => renamePath(needRoot(), from, to));
	handle("fs:trash", (rel: string) =>
		trashPath(needRoot(), rel, (absolute) => shell.trashItem(absolute)),
	);
}

/** Serve the built app from app://aiolists/, falling back to index.html for routes. */
function registerProtocol() {
	protocol.handle(SCHEME, async (request) => {
		const url = new URL(request.url);
		if (url.host !== HOST) return new Response("Not found", { status: 404 });
		const requested = decodeURIComponent(url.pathname).replace(/^\/+/, "");
		const candidate = path.resolve(DIST, requested || "index.html");
		const inside = path.relative(DIST, candidate);
		let file = path.join(DIST, "index.html");
		if (inside && !inside.startsWith("..") && !path.isAbsolute(inside)) {
			try {
				if ((await fs.stat(candidate)).isFile()) file = candidate;
			} catch {
				/* a route like /notes: serve the app shell */
			}
		}
		return net.fetch(pathToFileURL(file).toString());
	});
}

function createWindow() {
	const win = new BrowserWindow({
		width: 1280,
		height: 820,
		minWidth: 360,
		minHeight: 480,
		show: false,
		backgroundColor: "#111827",
		webPreferences: {
			preload: path.join(__dirname, "preload.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});
	mainWindow = win;
	win.once("ready-to-show", () => win.show());

	// Only the app itself may be shown here; links go to the real browser.
	win.webContents.on("will-navigate", (event, target) => {
		if (target.startsWith(`${ORIGIN}/`) || (DEV_URL && target.startsWith(DEV_URL))) return;
		event.preventDefault();
		if (/^https?:\/\//i.test(target)) void shell.openExternal(target);
	});
	win.webContents.setWindowOpenHandler(({ url }) => {
		if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
		return { action: "deny" };
	});

	// Let the page save everything before the window goes away.
	let flushed = false;
	win.on("close", (event) => {
		if (flushed) return;
		event.preventDefault();
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			ipcMain.removeListener("desktop:flushed", onFlushed);
			flushed = true;
			win.close();
		};
		const onFlushed = (e: Electron.IpcMainEvent) => {
			if (e.sender === win.webContents) finish();
		};
		ipcMain.on("desktop:flushed", onFlushed);
		setTimeout(finish, FLUSH_TIMEOUT_MS);
		win.webContents.send("desktop:before-close");
	});
	win.on("closed", () => {
		mainWindow = null;
	});

	void win.loadURL(DEV_URL ?? `${ORIGIN}/`);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
	app.quit();
} else {
	app.on("second-instance", () => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		}
	});
	void app.whenReady().then(() => {
		Menu.setApplicationMenu(null);
		registerProtocol();
		registerIpc();
		createWindow();
	});
	app.on("window-all-closed", () => app.quit());
}
