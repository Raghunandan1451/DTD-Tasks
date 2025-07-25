import { render, screen, fireEvent } from "@testing-library/react";
import Textarea from "@src/components/ui/textbox/Textarea";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";

describe("Textarea Component", () => {
	it("renders the textarea element", () => {
		render(<Textarea value="" onChange={() => {}} />);
		const textarea = screen.getByRole("textbox");
		expect(textarea).toBeInTheDocument();
	});

	it("renders with default placeholder text", () => {
		render(<Textarea value="" onChange={() => {}} />);
		const textarea = screen.getByPlaceholderText("Start writing...");
		expect(textarea).toBeInTheDocument();
	});

	it("accepts a custom placeholder", () => {
		render(
			<Textarea
				value=""
				onChange={() => {}}
				placeholder="Enter text..."
			/>
		);
		const textarea = screen.getByPlaceholderText("Enter text...");
		expect(textarea).toBeInTheDocument();
	});

	it("updates value when typed into", () => {
		const handleChange = vi.fn();
		render(<Textarea value="" onChange={handleChange} />);
		const textarea = screen.getByRole("textbox");

		fireEvent.change(textarea, { target: { value: "Hello" } });

		expect(handleChange).toHaveBeenCalledTimes(1);
	});

	it("renders with default rows value", () => {
		render(<Textarea value="" onChange={() => {}} />);
		const textarea = screen.getByRole("textbox");
		expect(textarea).toHaveAttribute("rows", "3");
	});

	it("renders with custom rows value", () => {
		render(<Textarea value="" onChange={() => {}} rows={5} />);
		const textarea = screen.getByRole("textbox");
		expect(textarea).toHaveAttribute("rows", "5");
	});
});
