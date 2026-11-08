import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useResizablePanel } from "@src/lib/hooks/useResizablePanel";

const attach = (hook: ReturnType<typeof useResizablePanel>, rect: { left: number; right: number }) => {
	const parent = document.createElement("div");
	Object.defineProperty(parent, "clientWidth", { value: 1000 });
	const el = document.createElement("div");
	parent.appendChild(el);
	el.getBoundingClientRect = () => ({ ...rect, top: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} });
	(hook.containerRef as { current: HTMLDivElement | null }).current = el;
};

const drag = (clientX: number) =>
	window.dispatchEvent(new MouseEvent("pointermove", { clientX }));

describe("useResizablePanel", () => {
	it("keeps the markdown defaults: left anchor, 240px, max 25%", () => {
		const { result } = renderHook(() => useResizablePanel());
		expect(result.current.width).toBe(240);
		attach(result.current, { left: 0, right: 240 });

		act(() => result.current.startDragging());
		act(() => drag(200));
		expect(result.current.width).toBe(200);
		act(() => drag(900));
		expect(result.current.width).toBe(250);
		act(() => drag(10));
		expect(result.current.width).toBe(180);
	});

	it("grows leftwards for a right-anchored panel", () => {
		const { result } = renderHook(() =>
			useResizablePanel({ anchor: "right", defaultWidth: 300, minWidth: 200, maxRatio: 0.5 }),
		);
		expect(result.current.width).toBe(300);
		attach(result.current, { left: 700, right: 1000 });

		act(() => result.current.startDragging());
		act(() => drag(600));
		expect(result.current.width).toBe(400);
		act(() => drag(100));
		expect(result.current.width).toBe(500);
		act(() => drag(950));
		expect(result.current.width).toBe(200);
	});

	it("does nothing when not dragging", () => {
		const { result } = renderHook(() => useResizablePanel());
		attach(result.current, { left: 0, right: 240 });
		act(() => drag(100));
		expect(result.current.width).toBe(240);
	});
});
