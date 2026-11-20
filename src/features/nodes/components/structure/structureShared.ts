import type { FlowNode } from "@src/features/nodes/lib/serialize";

export const BTN =
	"inline-flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-md px-2 text-xs text-gray-800 dark:text-gray-100 bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 disabled:opacity-40 disabled:pointer-events-none md:min-h-8 md:min-w-8";
export const SELECT =
	"min-h-9 rounded-md bg-black/5 px-1 text-xs text-gray-800 dark:bg-white/10 dark:text-gray-100 md:min-h-8";
export const TOGGLED = "ring-2 ring-cyan-400";

export const textOf = (node: FlowNode): string =>
	(node.type === "note" ? node.data.title : node.data.text) ?? "";
