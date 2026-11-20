import { useEffect } from "react";
import { flushPendingSaves } from "@src/lib/utils/persistMiddleware";

/**
 * Writes pending edits right away when the window loses focus or is hidden, when
 * `key` changes (e.g. another note is opened) and when the page unmounts.
 */
export const useFlushOnLeave = (key: unknown): void => {
	useEffect(() => {
		const flush = () => void flushPendingSaves();
		const onVisibility = () => {
			if (document.visibilityState === "hidden") flush();
		};
		window.addEventListener("blur", flush);
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			window.removeEventListener("blur", flush);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, []);

	useEffect(() => {
		return () => {
			void flushPendingSaves();
		};
	}, [key]);
};
