import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		tsconfigPaths({
			projects: ["./tsconfig.test.json"],
		}),
	],
	build: {
		emptyOutDir: true,
	},
	optimizeDeps: {
		esbuildOptions: {
			supported: {
				"top-level-await": true,
			},
		},
	},
	test: {
		globals: true,
		environment: "jsdom",
	},
});
