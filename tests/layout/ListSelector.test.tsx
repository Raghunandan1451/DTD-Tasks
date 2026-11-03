import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ListSelector from "@src/layout/ListSelector";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@src/lib/context/ThemeContext";

const renderAt = (path: string) =>
	render(
		<MemoryRouter initialEntries={[path]}>
			<ThemeProvider>
				<ListSelector />
			</ThemeProvider>
		</MemoryRouter>,
	);

// The desktop and mobile menus both render each link.
const desktopLink = (name: string) =>
	screen
		.getAllByRole("link", { name: new RegExp(name) })
		.find((link) => link.classList.contains("glass-link"));

describe("ListSelector component", () => {
	beforeEach(() => {
		global.matchMedia = vi.fn().mockImplementation((query) => ({
			matches: query === "(prefers-color-scheme: dark)",
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));
	});

	it("renders a flat list without Events or group titles", () => {
		renderAt("/");

		["Home", "Expenses", "QR Code", "Markdown"].forEach((name) => {
			expect(desktopLink(name)).toBeInTheDocument();
		});
		expect(screen.queryByText("Events")).not.toBeInTheDocument();
		expect(screen.queryByText("Trackers")).not.toBeInTheDocument();
		expect(screen.queryByText("Generators")).not.toBeInTheDocument();
		expect(screen.queryByText("Editors")).not.toBeInTheDocument();
	});

	it("links Home to the root route", () => {
		renderAt("/expenses");

		expect(desktopLink("Home")).toHaveAttribute("href", "/");
		expect(desktopLink("Expenses")).toHaveAttribute("href", "/expenses");
	});

	it("marks the current route as active", () => {
		renderAt("/expenses");

		expect(desktopLink("Expenses")).toHaveClass("active");
		expect(desktopLink("Home")).not.toHaveClass("active");
	});

	it("marks Home active at the root", () => {
		renderAt("/");

		expect(desktopLink("Home")).toHaveClass("active");
	});

	it("shows a desktop-only badge only on Expenses", () => {
		renderAt("/");

		expect(desktopLink("Expenses")).toHaveTextContent("Desktop only");
		expect(desktopLink("Markdown")).not.toHaveTextContent("Desktop only");
		expect(desktopLink("Home")).not.toHaveTextContent("Desktop only");
		expect(desktopLink("QR Code")).not.toHaveTextContent("Desktop only");
	});
});
