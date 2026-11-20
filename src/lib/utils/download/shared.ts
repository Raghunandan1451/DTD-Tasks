


import { FileTree, Metadata } from "@src/lib/types/downloadHandlerTypes";
import { File, Folder } from "@src/features/markdown/type";






import { SCHEMA_VERSION } from "@src/lib/utils/schemaVersion";






export const formatTimestamp = (): string => {
	const timestamp = new Date()
		.toISOString()
		.replace(/[:.]/g, "-")
		.slice(0, -5);
	return timestamp;
};

export const createMetadata = (section: string, dataCount: number): Metadata => {
	return {
		section,
		exportDate: new Date().toISOString(),
		itemCount: dataCount,
		version: "1.0.0",
		schemaVersion: SCHEMA_VERSION,
		appName: "List Manager",
	};
};

export const convertToFileTree = (
	items: (File | Folder)[],
	basePath: string = "",
): FileTree[] => {
	return items.map((item) => {
		const fullPath = basePath ? `${basePath}/${item.path}` : item.path;

		if (item.type === "folder") {
			return {
				path: item.path,
				type: "folder",
				children: convertToFileTree(item.children, fullPath),
			};
		} else {
			return {
				path: item.path,
				type: "file",
				content: item.content,
			};
		}
	});
};
