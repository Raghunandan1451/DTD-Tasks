import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getOlderDay, getTimelineDays } from "@src/features/home/lib/timeline";
import {
	buildTimelineRows,
	daysBetween,
	type TimelineRow,
} from "@src/features/home/lib/timelineLayout";
import type {
	TimelineDay,
	TimelineFilter,
} from "@src/features/home/lib/timelineTypes";
import { hydrateExpenses } from "@src/lib/store/thunks/expenseThunk";
import { hydrateMarkdown } from "@src/lib/store/thunks/markdownThunk";
import {
	selectExpenses,
	selectExpensesLoaded,
} from "@src/lib/store/selectors/expenseSelectors";
import type { AppDispatch, RootState } from "@src/lib/store/store";
import { formatISODate, todayISO } from "@src/lib/utils/isoDate";

/** Days added by each "Load more" (and shown initially). */
export const TIMELINE_PAGE_DAYS = 30;

export type TimelineStatus = "loading" | "ready" | "error";

interface LoadedTimeline {
	filter: TimelineFilter;
	windowDays: number;
	days: TimelineDay[];
	/** Newest day older than the window that still has activity, or null. */
	olderDay: string | null;
}

const windowRange = (days: number) => {
	const from = new Date();
	from.setDate(from.getDate() - (days - 1));
	return { fromDay: formatISODate(from), toDay: todayISO() };
};

export const useTimeline = () => {
	const dispatch = useDispatch<AppDispatch>();
	const expenses = useSelector(selectExpenses);
	const expensesLoaded = useSelector(selectExpensesLoaded);
	const files = useSelector((state: RootState) => state.fileManager.files);
	const filesLoaded = useSelector((state: RootState) => state.fileManager.loaded);

	const [filter, setFilterState] = useState<TimelineFilter>("all");
	const [windowDays, setWindowDays] = useState(TIMELINE_PAGE_DAYS);
	const [hydrated, setHydrated] = useState(false);
	const [loaded, setLoaded] = useState<LoadedTimeline | null>(null);
	const [failed, setFailed] = useState(false);
	const [version, setVersion] = useState(0);
	const latestRequest = useRef(0);

	// Expenses and the file tree live in Redux and must be loaded before merging.
	// allSettled: a missing/failed load must not leave the page loading forever.
	useEffect(() => {
		let cancelled = false;
		const pending: Promise<unknown>[] = [];
		if (!expensesLoaded) pending.push(dispatch(hydrateExpenses()));
		if (!filesLoaded) pending.push(dispatch(hydrateMarkdown()));
		Promise.allSettled(pending).then(() => {
			if (!cancelled) setHydrated(true);
		});
		return () => {
			cancelled = true;
		};
		// Hydrate once per mount; later changes are handled by the load effect.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dispatch]);

	useEffect(() => {
		if (!hydrated) return;
		const request = ++latestRequest.current;
		const range = windowRange(windowDays);
		Promise.all([
			getTimelineDays(range, filter),
			getOlderDay(range.fromDay, filter),
		])
			.then(([days, olderDay]) => {
				if (request !== latestRequest.current) return;
				setLoaded({ filter, windowDays, days, olderDay });
				setFailed(false);
			})
			.catch((error: unknown) => {
				if (request !== latestRequest.current) return;
				console.error("[timeline] Failed to load", error);
				setFailed(true);
			});
	}, [hydrated, filter, windowDays, expenses, files, version]);

	const refresh = useCallback(() => {
		setFailed(false);
		setVersion((value) => value + 1);
	}, []);

	const setFilter = useCallback((next: TimelineFilter) => {
		setFilterState(next);
		setWindowDays(TIMELINE_PAGE_DAYS);
	}, []);

	const olderDay = loaded?.olderDay ?? null;
	const loadMore = useCallback(() => {
		// Reach at least the next day with activity, so one press always shows something new.
		const reach = olderDay ? daysBetween(todayISO(), olderDay) + 1 : 0;
		setWindowDays((current) => Math.max(current + TIMELINE_PAGE_DAYS, reach));
	}, [olderDay]);

	// Only trust data that was loaded for the filter now selected.
	const current = loaded && loaded.filter === filter ? loaded : null;
	const status: TimelineStatus = failed ? "error" : current ? "ready" : "loading";

	const rows: TimelineRow[] = useMemo(
		() => buildTimelineRows(current?.days ?? [], todayISO()),
		[current],
	);

	return {
		rows,
		status,
		refresh,
		filter,
		setFilter,
		hasMore: olderDay !== null && current !== null,
		loadingMore: current !== null && current.windowDays !== windowDays,
		loadMore,
	};
};
