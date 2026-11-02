import { useCallback, useEffect, useState } from "react";
import { saveAs } from "file-saver";
import {
	LEGACY_EVENTS_PENDING_KEY,
	deleteValue,
	getValue,
} from "@src/lib/db/database";

type ShowNotificationFn = (
	message: string,
	type?: "error" | "success" | "info",
) => void;

const timestamp = (): string =>
	new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);

/**
 * Events was removed. The v2 database upgrade parks any old events under
 * LEGACY_EVENTS_PENDING_KEY; this offers them once and then clears the key.
 */
export const useLegacyEvents = (showNotification?: ShowNotificationFn) => {
	const [pending, setPending] = useState<unknown | null>(null);

	useEffect(() => {
		let cancelled = false;
		getValue<unknown>(LEGACY_EVENTS_PENDING_KEY)
			.then((value) => {
				if (!cancelled) setPending(value);
			})
			.catch((error) => {
				console.error("Failed to read legacy events", error);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const clear = useCallback(async () => {
		try {
			await deleteValue(LEGACY_EVENTS_PENDING_KEY);
			setPending(null);
		} catch (error) {
			console.error("Failed to clear legacy events", error);
			showNotification?.("Couldn't clear the saved events", "error");
		}
	}, [showNotification]);

	const download = useCallback(async () => {
		if (pending === null) return;
		try {
			const blob = new Blob([JSON.stringify(pending, null, 2)], {
				type: "application/json",
			});
			saveAs(blob, `events-backup_${timestamp()}.json`);
			showNotification?.("Events backup downloaded", "success");
		} catch (error) {
			// Keep the data: don't clear when the save itself failed.
			console.error("Failed to download legacy events", error);
			showNotification?.("Failed to download events", "error");
			return;
		}
		await clear();
	}, [pending, clear, showNotification]);

	return { hasLegacyEvents: pending !== null, download, skip: clear };
};
