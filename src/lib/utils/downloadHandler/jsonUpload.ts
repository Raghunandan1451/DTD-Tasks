import type { ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";

export const handleJSONUpload = async <T = unknown>(
	file: globalThis.File,
	onSuccess: (data: T) => void,
	onError?: (error: string) => void,
	showNotification?: ShowNotificationFn,
): Promise<void> => {
	try {
		const text = await file.text();
		const data = JSON.parse(text) as T;

		if (typeof data !== "object" || data === null) {
			throw new Error("Invalid JSON structure");
		}

		onSuccess(data);
		showNotification?.("Data restored successfully", "success");
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Invalid JSON file";
		console.error("JSON Upload Error:", errorMessage);
		showNotification?.(errorMessage, "error");
		onError?.(errorMessage);
	}
};
