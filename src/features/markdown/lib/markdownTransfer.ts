import type { File, Folder } from "@src/features/markdown/type";

const isMarkdownItem = (value: unknown): value is File | Folder => {
	if (typeof value !== "object" || value === null) return false;
	if (
		!("path" in value) ||
		typeof value.path !== "string" ||
		value.path.length === 0 ||
		!("type" in value)
	) {
		return false;
	}
	if (value.type === "file") {
		return "content" in value && typeof value.content === "string";
	}
	return (
		value.type === "folder" &&
		"children" in value &&
		Array.isArray(value.children) &&
		value.children.every(isMarkdownItem)
	);
};

export const parseMarkdownJSON = (value: unknown): (File | Folder)[] => {
	if (typeof value !== "object" || value === null || !("files" in value)) {
		throw new Error("Choose a valid Markdown JSON file.");
	}
	if (!Array.isArray(value.files) || !value.files.every(isMarkdownItem)) {
		throw new Error("Markdown JSON contains an invalid file tree.");
	}
	return value.files;
};
