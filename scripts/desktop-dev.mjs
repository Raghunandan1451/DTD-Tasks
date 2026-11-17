// Runs the Vite dev server in desktop mode and opens Electron against it.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const PORT = 5174;
const URL_ = `http://localhost:${PORT}`;
const require = createRequire(import.meta.url);
const electronPath = require("electron");
const run = (cmd, args, opts = {}) =>
	spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });

await new Promise((resolve, reject) => {
	const build = run("node", ["scripts/build-electron.mjs"]);
	build.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("electron build failed"))));
});

const vite = run("npx", ["vite", "--mode", "desktop", "--port", String(PORT), "--strictPort"]);

const waitForServer = async () => {
	for (let i = 0; i < 120; i++) {
		try {
			if ((await fetch(URL_)).ok) return;
		} catch {
			/* not up yet */
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error("Vite dev server did not start");
};
await waitForServer();

const electron = spawn(electronPath, ["."], {
	stdio: "inherit",
	env: { ...process.env, AIOLISTS_DEV_URL: URL_ },
});
electron.on("exit", () => {
	vite.kill();
	process.exit(0);
});
