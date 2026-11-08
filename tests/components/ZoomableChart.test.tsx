import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom";
import ZoomableChart from "@src/components/shared/chart_zoom/ZoomableChart";

const renderChart = () =>
	render(
		<ZoomableChart title="Spending" height={200}>
			{({ height, zoomButton, zoomed }) => (
				<div data-testid="chart" data-height={height} data-zoomed={String(zoomed)}>
					{zoomButton}
				</div>
			)}
		</ZoomableChart>,
	);

describe("ZoomableChart", () => {
	it("renders inline at its normal height with a zoom button", () => {
		renderChart();
		expect(screen.getByTestId("chart")).toHaveAttribute("data-height", "200");
		expect(screen.getByLabelText("Zoom in on Spending")).toBeInTheDocument();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("opens a taller copy in a dialog and closes with Escape, returning focus", () => {
		renderChart();
		const trigger = screen.getByLabelText("Zoom in on Spending");
		fireEvent.click(trigger);

		const dialog = screen.getByRole("dialog", { name: "Spending" });
		expect(dialog).toBeInTheDocument();
		const zoomedChart = screen
			.getAllByTestId("chart")
			.find((el) => el.getAttribute("data-zoomed") === "true");
		expect(Number(zoomedChart?.getAttribute("data-height"))).toBeGreaterThanOrEqual(320);

		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});

	it("closes from the close button and the backdrop, but not from clicks inside", () => {
		renderChart();
		fireEvent.click(screen.getByLabelText("Zoom in on Spending"));
		fireEvent.click(screen.getByRole("dialog"));
		expect(screen.getByRole("dialog")).toBeInTheDocument();

		fireEvent.click(screen.getByLabelText("Close zoomed chart"));
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

		fireEvent.click(screen.getByLabelText("Zoom in on Spending"));
		fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("also opens on double-click", () => {
		renderChart();
		fireEvent.doubleClick(screen.getByTestId("chart"));
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});
});
