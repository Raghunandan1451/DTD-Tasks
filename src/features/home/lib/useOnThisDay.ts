import { useEffect, useState } from "react";
import { getJournalOnThisDay } from "@src/lib/db/journalRepo";
import type { JournalEntry } from "@src/lib/db/types";

/** Notes written on today's calendar date in earlier years, newest first. */
export const useOnThisDay = (): JournalEntry[] => {
	const [entries, setEntries] = useState<JournalEntry[]>([]);

	useEffect(() => {
		let cancelled = false;
		getJournalOnThisDay(new Date())
			.then((found) => {
				if (!cancelled) setEntries(found);
			})
			.catch((error: unknown) => {
				// A memory card is optional: never let it break the page.
				console.warn("[timeline] Could not load On this day", error);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	return entries;
};
