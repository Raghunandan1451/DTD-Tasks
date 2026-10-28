import { render, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import { UploadError } from "@src/lib/utils/uploadError";

const pickFiles = (names: string[]) => {
	const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
	const files = names.map((name) => new File(["{}"], name));
	fireEvent.change(input, { target: { files } });
	return input;
};

const renderWith = (props: Partial<React.ComponentProps<typeof TitleWithButton>>) => {
	const showNotification = vi.fn();
	render(
		<TitleWithButton
			heading="Test"
			buttonText="Download"
			onDownload={() => {}}
			showUpload
			showNotification={showNotification}
			{...props}
		/>,
	);
	return showNotification;
};

describe("TitleWithButton upload", () => {
	it("keeps the default success message when the handler returns nothing", async () => {
		const notify = renderWith({ onUpload: vi.fn() });
		pickFiles(["a.json"]);
		await waitFor(() =>
			expect(notify).toHaveBeenCalledWith("Data restored successfully!", "success"),
		);
	});

	it("shows a custom success message returned by the handler", async () => {
		const notify = renderWith({ onUpload: async () => "Restored 3 events" });
		pickFiles(["a.json"]);
		await waitFor(() =>
			expect(notify).toHaveBeenCalledWith("Restored 3 events", "success"),
		);
	});

	it("keeps a generic error for ordinary failures", async () => {
		const notify = renderWith({
			onUpload: async () => {
				throw new Error("internal detail");
			},
		});
		pickFiles(["a.json"]);
		await waitFor(() =>
			expect(notify).toHaveBeenCalledWith("Failed to restore data", "error"),
		);
	});

	it("shows the message of an UploadError", async () => {
		const notify = renderWith({
			onUpload: async () => {
				throw new UploadError("calendar.json: not a backup");
			},
		});
		pickFiles(["calendar.json"]);
		await waitFor(() =>
			expect(notify).toHaveBeenCalledWith("calendar.json: not a backup", "error"),
		);
	});

	it("passes every picked file to onUploadFiles and enables multi-select", async () => {
		const onUploadFiles = vi.fn();
		renderWith({ onUploadFiles });
		const input = pickFiles(["finance.json", "expenses.json"]);

		expect(input.multiple).toBe(true);
		await waitFor(() => expect(onUploadFiles).toHaveBeenCalledTimes(1));
		expect(onUploadFiles.mock.calls[0][0].map((f: File) => f.name)).toEqual([
			"finance.json",
			"expenses.json",
		]);
	});

	it("is single-select when only onUpload is given", () => {
		renderWith({ onUpload: vi.fn() });
		expect(
			document.querySelector<HTMLInputElement>("input[type=file]")!.multiple,
		).toBe(false);
	});
});
