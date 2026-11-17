import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi } from "@src/lib/desktop/types";

const invoke = <T>(channel: string, ...args: unknown[]) =>
	ipcRenderer.invoke(channel, ...args) as Promise<T>;

const beforeCloseHandlers = new Set<() => Promise<void> | void>();

// Always answer, even when no page code registered a handler, so closing never waits.
ipcRenderer.on("desktop:before-close", async () => {
	try {
		await Promise.all([...beforeCloseHandlers].map((handler) => handler()));
	} catch {
		/* closing matters more than a failed save report */
	} finally {
		ipcRenderer.send("desktop:flushed");
	}
});

const api: DesktopApi = {
	folder: {
		getState: () => invoke("folder:getState"),
		choose: () => invoke("folder:choose"),
		confirm: () => invoke("folder:confirm"),
		retry: () => invoke("folder:retry"),
		forget: () => invoke("folder:forget"),
	},
	fs: {
		readText: (rel) => invoke("fs:readText", rel),
		writeText: (rel, content) => invoke("fs:writeText", rel, content),
		list: (rel) => invoke("fs:list", rel),
		mkdir: (rel) => invoke("fs:mkdir", rel),
		rename: (from, to) => invoke("fs:rename", from, to),
		trash: (rel) => invoke("fs:trash", rel),
	},
	onBeforeClose(handler) {
		beforeCloseHandlers.add(handler);
		return () => {
			beforeCloseHandlers.delete(handler);
		};
	},
};

contextBridge.exposeInMainWorld("desktop", api);
