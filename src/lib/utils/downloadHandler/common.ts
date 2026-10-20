import type { File, Folder } from "@src/features/markdown/type";
import type { Event } from "@src/features/event/type";
import type { FileTree, Metadata } from "@src/lib/types/downloadHandlerTypes";

export const formatTimestamp = (): string => {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
	return timestamp;
};

export const createICS = (events: Event[]): string => {
	const header = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ListManager//EN\nCALSCALE:GREGORIAN`;
	const body = events.map((ev) => {
		const formatDate = (date: string) => date.replace(/-/g, "");
		return `BEGIN:VEVENT\nUID:${ev.id}@listmanager\nSUMMARY:${ev.title || "Event"}\nDTSTART;VALUE=DATE:${formatDate(ev.startDate)}\nDTEND;VALUE=DATE:${formatDate(ev.endDate)}\nDESCRIPTION:${ev.content || ""}\nCATEGORIES:${ev.tag}\nSTATUS:CONFIRMED\nEND:VEVENT`;
	}).join("\n");
	return `${header}\n${body}\nEND:VCALENDAR`;
};

export const createMetadata = (section: string, dataCount: number): Metadata => ({
	section,
	exportDate: new Date().toISOString(),
	itemCount: dataCount,
	version: "1.0.0",
	appName: "List Manager",
});

export const convertToFileTree = (items: (File | Folder)[], basePath = ""): FileTree[] => items.map((item) => {
	const fullPath = basePath ? `${basePath}/${item.path}` : item.path;
	if (item.type === "folder") {
		return { path: item.path, type: "folder", children: convertToFileTree(item.children, fullPath) };
	}
	return { path: item.path, type: "file", content: item.content };
});
