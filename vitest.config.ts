import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		// Mirror the same aliases in test environment
		alias: {
			'@src': '/src',
		},
	},
});
