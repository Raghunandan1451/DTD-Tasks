import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss(), tsconfigPaths()],
	build: {
		outDir: "dist",
		emptyOutDir: true,
		target: "esnext",
	},
	optimizeDeps: {
		esbuildOptions: {
			supported: {
				"top-level-await": true,
			},
		},
	},
	server: {
		host: true,
		port: 5173,
	},
	test: {
		globals: true,
		environment: "jsdom",
		include: ["tests/**/*.{test,spec}.{ts,tsx}"],
	},
});
