import { Dispatch } from "react";
import { Action } from "@reduxjs/toolkit";
import {
	addFolder,
	addFile,
	selectFile,
	deleteFile,
	renameFile,
} from "@src/lib/store/slices/markdownSlice";

import { File, Folder, BaseItem } from "@src/features/markdown/type";

type NotificationType = "success" | "error" | "info";

type ShowNotificationFunc = (message: string, type: NotificationType) => void;

export const handleToggleFolder = (
	expandedFolders: Set<string>,
	setExpandedFolders: (newExpanded: Set<string>) => void,
	path: string
): void => {
	const newExpanded = new Set(expandedFolders);
	if (newExpanded.has(path)) {
		newExpanded.delete(path);
	} else {
		newExpanded.add(path);
	}
	setExpandedFolders(newExpanded);
};

export const handleFileSelect = (
	dispatch: Dispatch<Action>,
	item: BaseItem,
	parentPath: string = ""
): void => {
	const fullPath = [parentPath, item.path].filter(Boolean).join("/");
	dispatch(selectFile(fullPath));
};

export const handleCreateFile = (
	dispatch: Dispatch<Action>,
	files: (File | Folder)[],
	showNotification: ShowNotificationFunc,
	newFilePath: string
): void => {
	if (!newFilePath.trim()) {
		showNotification("Please enter a file name", "error");
		return;
	}

	const fullPath = newFilePath.trim().endsWith(".md")
		? newFilePath.trim()
		: `${newFilePath.trim()}.md`;

	const pathParts = fullPath.split("/");
	const fileName = pathParts.pop()?.toString() || "";
	const folderPath = pathParts;

	let currentLevel = files;
	const parentPath: string[] = [];

	try {
		for (const folderName of folderPath) {
			const folder = currentLevel.find(
				(item): item is Folder =>
					item.type === "folder" && item.path === folderName
			);

			if (!folder) {
				// Create missing folder structure
				const newFolder: Folder = {
					path: folderName,
					type: "folder",
					children: [],
				};

				dispatch(
					addFolder({
						parentPath: parentPath.join("/"),
						folder: newFolder,
					})
				);

				currentLevel = newFolder.children;
			} else {
				currentLevel = folder.children;
			}

			parentPath.push(folderName);
		}

		const fileExists = currentLevel.some(
			(item) => item.type === "file" && item.path === fileName
		);

		if (fileExists) {
			showNotification("File already exists in this directory!", "error");
			return;
		}

		dispatch(
			addFile({
				path: fileName,
				content: "",
				parentPath: parentPath.join("/"),
			})
		);

		showNotification("File created successfully!", "success");
	} catch (error) {
		showNotification("Error creating file structure", "error");
		console.error("File creation error:", error);
	}
};

export const handleDeleteFile = (
	dispatch: Dispatch<Action>,
	fullPath: string,
	showNotification: ShowNotificationFunc
): void => {
	if (fullPath) {
		dispatch(deleteFile({ path: fullPath }));
		showNotification("File/Folder deleted successfully", "success");
	}
};

export const handleRenameFile = (
	dispatch: Dispatch<Action>,
	path: string,
	newName: string,
	showNotification: ShowNotificationFunc
): void => {
	if (!newName) {
		showNotification("Please enter a valid name", "error");
		return;
	}

	if (newName.includes("/")) {
		showNotification("Name cannot contain slashes", "error");
		return;
	}

	const renamedFile = newName.trim().endsWith(".md")
		? newName.trim()
		: `${newName.trim()}.md`;

	dispatch(renameFile({ oldPath: path, newName: renamedFile }));
	showNotification("File renamed successfully", "success");
};

export const findFileByPath = (
	files: (File | Folder)[],
	fullPath: string
): File | null => {
	// Add error handling for invalid inputs
	if (!fullPath || typeof fullPath !== "string") {
		console.error("Invalid path provided to findFileByPath:", fullPath);
		return null;
	}

	const pathParts = fullPath.split("/").filter(Boolean);
	let currentFiles = files || [];

	for (const part of pathParts) {
		const item = currentFiles.find((el) => el?.path === part);

		if (!item) return null;

		if (part === pathParts[pathParts.length - 1]) {
			return item.type === "file" ? item : null;
		}

		if (item.type === "folder" && item.children) {
			currentFiles = item.children;
		} else {
			return null;
		}
	}

	return null;
};

export const sortFilesAlphabetically = (
	items: (File | Folder)[]
): (File | Folder)[] => {
	return [...items].sort((a, b) => {
		// Folders first
		if (a.type === "folder" && b.type !== "folder") return -1;
		if (b.type === "folder" && a.type !== "folder") return 1;

		// Case-insensitive alphabetical sort
		return a.path.localeCompare(b.path, undefined, { sensitivity: "base" });
	});
};
