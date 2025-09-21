import { useEffect, useMemo, RefObject } from "react";
import { generateRecurringInstances } from "@src/features/event/lib/utils";
import { DateColumn, Event } from "@src/features/event/type";

// Hook: auto-scroll to current hour
export function useAutoScrollToHour(ref: RefObject<HTMLDivElement>) {
	useEffect(() => {
		if (ref.current) {
			const now = new Date();
			const currentHour = now.getHours();
			const scrollPosition = Math.max(0, (currentHour - 2) * 60);

			ref.current.scrollTo({
				top: scrollPosition,
				behavior: "smooth",
			});
		}
	}, [ref]);
}

// Hook: recurring events (wraps utility function with memo)
export function useRecurringEvents(events: Event[], dateColumns: DateColumn[]) {
	return useMemo(
		() => generateRecurringInstances(events, dateColumns),
		[events, dateColumns]
	);
}
