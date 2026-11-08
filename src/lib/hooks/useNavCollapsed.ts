import { useCallback, useState } from "react";

export const NAV_COLLAPSED_KEY = "nav_collapsed";

const read = (): boolean => {
	try {
		return localStorage.getItem(NAV_COLLAPSED_KEY) === "1";
	} catch {
		// Private windows or blocked storage: start expanded.
		return false;
	}
};

/** Desktop nav collapsed state, remembered in localStorage (not IndexedDB). */
export const useNavCollapsed = () => {
	const [collapsed, setCollapsed] = useState<boolean>(read);

	const toggle = useCallback(() => {
		setCollapsed((current) => {
			const next = !current;
			try {
				localStorage.setItem(NAV_COLLAPSED_KEY, next ? "1" : "0");
			} catch {
				// The choice still applies for this visit.
			}
			return next;
		});
	}, []);

	return { collapsed, toggle };
};
