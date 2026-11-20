import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SaveStatusBadge from "@src/components/shared/save_status/SaveStatusBadge";
import { markSaved, markSaveFailed, markSaving } from "@src/lib/utils/saveStatus";

vi.mock("@src/lib/utils/persistMiddleware", () => ({ retryFailedSaves: vi.fn() }));

describe("SaveStatusBadge", () => {
	it("shows Saving, Saved and a visible error with Retry", () => {
		render(<SaveStatusBadge />);
		act(() => markSaving());
		expect(screen.getByRole("status")).toHaveTextContent("Saving…");
		act(() => markSaved());
		expect(screen.getByRole("status")).toHaveTextContent("Saved");
		act(() => markSaveFailed(new Error("Disk is full")));
		expect(screen.getByRole("alert")).toHaveTextContent("Could not save: Disk is full");
		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
	});
});
