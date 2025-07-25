import { render, screen, fireEvent } from "@testing-library/react";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import { describe, it, expect, vi } from "vitest";
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

	it("calls onDownload with the correct heading when button is clicked", () => {
		const mockOnDownload = vi.fn();
		render(
			<TitleWithButton
				heading="Report"
				onDownload={mockOnDownload}
				buttonText="Export"
			/>
		);
		const button = screen.getByRole("button", { name: /export/i });

		fireEvent.click(button);

		expect(mockOnDownload).toHaveBeenCalledTimes(1);
		expect(mockOnDownload).toHaveBeenCalledWith("Report");
	});
});
