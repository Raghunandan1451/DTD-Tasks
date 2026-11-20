// Bundles the Electron main and preload scripts into dist-electron/.
import { build } from "esbuild";

const common = {
	bundle: true,
	platform: "node",
	format: "cjs",
	target: "node22",
	external: ["electron"],
	sourcemap: true,
	// Resolves the @src/* and @shell/* aliases.
	tsconfig: "tsconfig.json",
	logLevel: "info",
};

await build({ ...common, entryPoints: ["electron/main.ts"], outfile: "dist-electron/main.cjs" });
// The sandboxed preload runs in a renderer-like context.
await build({
	...common,
	entryPoints: ["electron/preload.ts"],
	outfile: "dist-electron/preload.cjs",
});
