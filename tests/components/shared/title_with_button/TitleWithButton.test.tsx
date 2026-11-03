import { render, screen, fireEvent } from "@testing-library/react";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";

describe("TitleWithButton Component", () => {
	it("renders the heading with uppercase text", () => {
		render(
			<TitleWithButton
				heading="Test Heading"
				onDownload={() => {}}
				buttonText="Download"
			/>
		);
		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent("TEST HEADING");
	});

	it("renders the button with correct text", () => {
		render(
			<TitleWithButton
				heading="Sample"
				onDownload={() => {}}
				buttonText="Download"
			/>
		);
		const button = screen.getByRole("button", { name: /download/i });
		expect(button).toBeInTheDocument();
	});

	// The component passes the heading only to callbacks that declare a parameter
	// (a bare vi.fn() has none), so these use real functions.
	it("passes the heading to an onDownload that accepts it", () => {
		const received: string[] = [];
		const onDownload = (heading: string) => {
			received.push(heading);
		};
		render(
			<TitleWithButton
				heading="Report"
				onDownload={onDownload}
				buttonText="Export"
			/>
		);

		fireEvent.click(screen.getByRole("button", { name: /export/i }));

		expect(received).toEqual(["Report"]);
	});

	it("calls onDownload without arguments when it takes none", () => {
		const received: unknown[][] = [];
		const onDownload = (...args: unknown[]) => {
			received.push(args);
		};
		// A rest parameter has length 0, like a function with no parameters.
		expect(onDownload.length).toBe(0);
		render(
			<TitleWithButton
				heading="Report"
				onDownload={onDownload as () => void}
				buttonText="Export"
			/>
		);

		fireEvent.click(screen.getByRole("button", { name: /export/i }));

		expect(received).toEqual([[]]);
	});
});
