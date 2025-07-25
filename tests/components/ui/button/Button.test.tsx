import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import Button from "@src/components/ui/button/Button";

describe("Button component", () => {
	it("renders children correctly", () => {
		render(<Button>Click me!</Button>);
		expect(screen.getByText("Click me!")).toBeInTheDocument();
	});

	it("renders the text prop when provided", () => {
		render(<Button text="Submit" />);
		expect(screen.getByText("Submit")).toBeInTheDocument();
	});

	it("calls onClick handler when clicked", () => {
		const onClickMock = vi.fn();
		render(<Button onClick={onClickMock} text="Click" />);
		const button = screen.getByRole("button", { name: "Click" });
		fireEvent.click(button);
		expect(onClickMock).toHaveBeenCalledTimes(1);
	});

	it("renders as disabled when disabled prop is true", () => {
		render(<Button disabled text="Disabled" />);
		const button = screen.getByRole("button", { name: "Disabled" });
		expect(button).toBeDisabled();
	});

	it("has the correct type attribute", () => {
		render(<Button type="submit" text="Submit" />);
		const button = screen.getByRole("button", { name: "Submit" });
		expect(button).toHaveAttribute("type", "submit");
	});
});
