import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import ThemeToggle from "./ThemeToggle";
import "@testing-library/jest-dom";
import * as useThemeModule from "../../../lib/hooks/useTheme"; // Adjust the import path as necessary

// 👇 Mock the useTheme hook
vi.mock("../../../lib/hooks/useTheme", () => ({
	useTheme: () => ({
		theme: "light",
		toggleTheme: vi.fn(),
	}),
}));

describe("ThemeToggle", () => {
	it("renders Moon icon when theme is light", () => {
		render(<ThemeToggle />);
		expect(
			screen.getByRole("button", { name: /toggle theme/i })
		).toBeInTheDocument();
		expect(screen.getByRole("button").innerHTML).toMatch(/moon/i); // Adjust depending on how icon renders
	});

	it("calls toggleTheme on click", () => {
		const toggleTheme = vi.fn();

		vi.spyOn(useThemeModule, "useTheme").mockReturnValue({
			theme: "light",
			toggleTheme,
		});

		render(<ThemeToggle />);
		fireEvent.click(screen.getByRole("button", { name: /toggle theme/i }));
		expect(toggleTheme).toHaveBeenCalledTimes(1);
		expect(toggleTheme).toHaveBeenCalledTimes(1);
	});
});
