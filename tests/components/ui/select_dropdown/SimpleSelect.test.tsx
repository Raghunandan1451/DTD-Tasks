import { render, screen, fireEvent } from "@testing-library/react";
import SimpleSelect from "@src/components/ui/select_dropdown/SimpleSelect";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";

describe("SimpleSelect Component", () => {
	it("renders the select element with options", () => {
		render(
			<SimpleSelect
				id="test-select"
				value=""
				onChange={() => {}}
				options={["Option 1", "Option 2"]}
			/>
		);

		const select = screen.getByRole("combobox"); // 'combobox' is the role for select elements
		expect(select).toBeInTheDocument();
		expect(screen.getByText("Select an option")).toBeInTheDocument();
		expect(screen.getByText("Option 1")).toBeInTheDocument();
		expect(screen.getByText("Option 2")).toBeInTheDocument();
	});

	it("calls onChange when a new option is selected", () => {
		const handleChange = vi.fn();
		render(
			<SimpleSelect
				id="test-select"
				value=""
				onChange={handleChange}
				options={["Option 1", "Option 2"]}
			/>
		);

		const select = screen.getByRole("combobox");
		fireEvent.change(select, { target: { value: "Option 1" } });

		expect(handleChange).toHaveBeenCalledTimes(1);
	});

	it("sets the correct selected value", () => {
		render(
			<SimpleSelect
				id="test-select"
				value="Option 2"
				onChange={() => {}}
				options={["Option 1", "Option 2"]}
			/>
		);

		const select = screen.getByRole("combobox");
		expect(select).toHaveValue("Option 2");
	});

	it("calls onFocus when focused", () => {
		const handleFocus = vi.fn();
		render(
			<SimpleSelect
				id="test-select"
				value=""
				onChange={() => {}}
				onFocus={handleFocus}
				options={["Option 1", "Option 2"]}
			/>
		);

		const select = screen.getByRole("combobox");
		fireEvent.focus(select);

		expect(handleFocus).toHaveBeenCalledTimes(1);
	});

	it("calls onKeyDown when a key is pressed", () => {
		const handleKeyDown = vi.fn();
		render(
			<SimpleSelect
				id="test-select"
				value=""
				onChange={() => {}}
				onKeyDown={handleKeyDown}
				options={["Option 1", "Option 2"]}
			/>
		);

		const select = screen.getByRole("combobox");
		fireEvent.keyDown(select, { key: "ArrowDown", code: "ArrowDown" });

		expect(handleKeyDown).toHaveBeenCalledTimes(1);
	});
});
