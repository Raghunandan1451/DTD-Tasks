import { render, screen, fireEvent } from "@testing-library/react";
import AdvancedSelect from "@src/components/ui/select_dropdown/AdvancedSelect";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";

describe("AdvancedSelect Component", () => {
	const options = [
		{ id: "1", name: "Option 1" },
		{ id: "2", name: "Option 2" },
	];

	const getOptionProps = (option: { id: string; name: string }) => ({
		value: option.id,
		label: option.name,
	});

	it("renders the select element with options", () => {
		render(
			<AdvancedSelect
				id="test-advanced-select"
				value=""
				onChange={() => {}}
				options={options}
				getOptionProps={getOptionProps}
			/>
		);

		const select = screen.getByRole("combobox");
		expect(select).toBeInTheDocument();
		expect(screen.getByText("Select an option")).toBeInTheDocument();
		expect(screen.getByText("Option 1")).toBeInTheDocument();
		expect(screen.getByText("Option 2")).toBeInTheDocument();
	});

	it("calls onChange when a new option is selected", () => {
		const handleChange = vi.fn();
		render(
			<AdvancedSelect
				id="test-advanced-select"
				value=""
				onChange={handleChange}
				options={options}
				getOptionProps={getOptionProps}
			/>
		);

		const select = screen.getByRole("combobox");
		fireEvent.change(select, { target: { value: "1" } });

		expect(handleChange).toHaveBeenCalledTimes(1);
	});

	it("sets the correct selected value", () => {
		render(
			<AdvancedSelect
				id="test-advanced-select"
				value="2"
				onChange={() => {}}
				options={options}
				getOptionProps={getOptionProps}
			/>
		);

		const select = screen.getByRole("combobox");
		expect(select).toHaveValue("2");
	});

	it("disables the placeholder option when isDisabled is true", () => {
		render(
			<AdvancedSelect
				id="test-advanced-select"
				value=""
				onChange={() => {}}
				options={options}
				getOptionProps={getOptionProps}
				isDisabled={true}
			/>
		);

		const placeholderOption = screen.getByText("Select an option");
		expect(placeholderOption).toBeDisabled();
	});

	it("enables the placeholder option when isDisabled is false", () => {
		render(
			<AdvancedSelect
				id="test-advanced-select"
				value=""
				onChange={() => {}}
				options={options}
				getOptionProps={getOptionProps}
				isDisabled={false}
			/>
		);

		const placeholderOption = screen.getByText("Select an option");
		expect(placeholderOption).not.toBeDisabled();
	});
});
