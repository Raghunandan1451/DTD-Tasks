import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import ThemeContext, { ThemeProvider } from "@src/lib/context/ThemeContext";

// Helper consumer to access context values
const ThemeConsumer = () => {
	const context = React.useContext(ThemeContext);
	if (!context) return null;
	const { theme, toggleTheme } = context;

	return (
		<div>
			<span data-testid="theme">{theme}</span>
			<button onClick={toggleTheme}>Toggle</button>
		</div>
	);
};

describe("ThemeProvider", () => {
	let matchMediaMock: (query: string) => MediaQueryList;

	beforeEach(() => {
		// Clean up
		localStorage.clear();
		document.documentElement.classList.remove("dark");

		// Mock matchMedia
		matchMediaMock = vi.fn().mockImplementation((query) => ({
			matches: query === "(prefers-color-scheme: dark)",
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			value: matchMediaMock,
		});
	});

	it("defaults to system preference if no localStorage", () => {
		render(
			<ThemeProvider>
				<ThemeConsumer />
			</ThemeProvider>
		);
		const theme = screen.getByTestId("theme").textContent;
		expect(theme).toBe("dark"); // because matchMedia returns true
		expect(document.documentElement.classList.contains("dark")).toBe(true);
		expect(localStorage.getItem("theme")).toBe("dark");
	});

	it("uses theme from localStorage if available", () => {
		localStorage.setItem("theme", "light");
		render(
			<ThemeProvider>
				<ThemeConsumer />
			</ThemeProvider>
		);
		expect(screen.getByTestId("theme").textContent).toBe("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("toggles theme when toggleTheme is called", () => {
		render(
			<ThemeProvider>
				<ThemeConsumer />
			</ThemeProvider>
		);

		const themeEl = screen.getByTestId("theme");
		const button = screen.getByRole("button");

		expect(themeEl.textContent).toBe("dark");

		fireEvent.click(button);
		expect(themeEl.textContent).toBe("light");
		expect(localStorage.getItem("theme")).toBe("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});
});
