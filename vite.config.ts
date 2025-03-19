import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	build: {
		rollupOptions: {
			external: [/\.test\.(js|jsx|ts|tsx)$/, /\.spec\.(js|jsx|ts|tsx)$/],
		},
	},
	optimizeDeps: {
		esbuildOptions: {
			supported: {
				'top-level-await': true,
			},
		},
	},
	resolve: {
		alias: {
			'@src': '/src',
			'@components': '/src/components',
			'@layout': '/src/layout',
			'@store': '/src/store',
			'@utils': '/src/utils',
		},
	},
});
