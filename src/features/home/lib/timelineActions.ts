import { createContext, useContext } from "react";
import type { JournalPatch } from "@src/lib/db/journalRepo";

/** What the rows in the feed can do. Provided once by Timeline, used by any row. */
export interface TimelineActions {
	/** Selects a live file in the Markdown editor so it is open on arrival. */
	openFile: (fileId: string) => void;
	/** Points the Expenses page at the given day. */
	openExpenses: (day: string) => void;
	saveNote: (id: string, patch: JournalPatch) => Promise<void>;
	deleteNote: (id: string) => Promise<void>;
}

const unavailable = () => {
	throw new Error("TimelineActions are only available inside <Timeline>.");
};

export const TimelineActionsContext = createContext<TimelineActions>({
	openFile: unavailable,
	openExpenses: unavailable,
	saveNote: unavailable,
	deleteNote: unavailable,
});

export const useTimelineActions = (): TimelineActions =>
	useContext(TimelineActionsContext);
