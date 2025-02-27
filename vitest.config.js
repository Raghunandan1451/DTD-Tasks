import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		// Mirror the same aliases in test environment
		alias: {
			'@src': '/src',
			'@components': '/src/components',
			'@layout': '/src/layout',
			'@store': '/src/store',
			'@utils': '/src/utils',
		},
	},
});
