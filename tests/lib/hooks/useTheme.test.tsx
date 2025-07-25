import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useTheme } from "@src/lib/hooks/useTheme"; // adjust path as needed
import { ThemeProvider } from "@src/lib/context/ThemeContext";

// A simple test component to access the hook
const ThemeTestComponent = () => {
	const { theme, toggleTheme } = useTheme();
	return (
		<div>
			<span data-testid="theme">{theme}</span>
			<button onClick={toggleTheme}>Toggle</button>
		</div>
	);
};

describe("useTheme", () => {
	beforeEach(() => {
		// Mock window.matchMedia to return the preferred theme for testing purposes
		global.matchMedia = vi.fn().mockImplementation((query) => ({
			matches: query === "(prefers-color-scheme: dark)", // Set this to true or false depending on what theme you want to test
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));
	});

	it("returns context value when inside ThemeProvider", () => {
		render(
			<ThemeProvider>
				<ThemeTestComponent />
			</ThemeProvider>
		);

		expect(screen.getByTestId("theme").textContent).toMatch(/light|dark/);
	});

	it("throws error when used outside ThemeProvider", () => {
		// Suppress expected error logs
		const originalError = console.error;
		console.error = () => {};

		expect(() => render(<ThemeTestComponent />)).toThrowError(
			"useTheme must be used within a ThemeProvider"
		);

		console.error = originalError;
	});
});
