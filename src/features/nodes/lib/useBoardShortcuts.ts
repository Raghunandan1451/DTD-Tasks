import { useEffect, useRef } from "react";

export interface ShortcutActions {
	undo: () => void;
	redo: () => void;
	copy: () => void;
	paste: () => void;
	duplicate: () => void;
}

/** True when typing should win over canvas shortcuts. */
const isTypingTarget = (target: EventTarget | null): boolean => {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.isContentEditable ||
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA" ||
		target.tagName === "SELECT"
	);
};

const hasTextSelection = (): boolean => (window.getSelection()?.toString() ?? "") !== "";

/**
 * Ctrl/Cmd + Z, Shift+Z (or Y), C, V and D for the canvas. Ignored while the
 * user is typing in a field, so the browser's own undo and copy keep working
 * there. Delete is handled by React Flow (`deleteKeyCode`).
 */
export const useBoardShortcuts = (actions: ShortcutActions, enabled: boolean = true) => {
	const actionsRef = useRef(actions);
	useEffect(() => {
		actionsRef.current = actions;
	});

	useEffect(() => {
		if (!enabled) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
			if (isTypingTarget(event.target)) return;

			const run = actionsRef.current;
			switch (event.key.toLowerCase()) {
				case "z":
					event.preventDefault();
					if (event.shiftKey) run.redo();
					else run.undo();
					break;
				case "y":
					event.preventDefault();
					run.redo();
					break;
				case "c":
					// Leave normal copy alone when text elsewhere on the page is selected.
					if (hasTextSelection()) return;
					event.preventDefault();
					run.copy();
					break;
				case "v":
					event.preventDefault();
					run.paste();
					break;
				case "d":
					// Stops the browser's "bookmark this page".
					event.preventDefault();
					run.duplicate();
					break;
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [enabled]);
};
