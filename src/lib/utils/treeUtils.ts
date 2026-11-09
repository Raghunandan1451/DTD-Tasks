import { Dispatch } from "react";
import { Action, nanoid } from "@reduxjs/toolkit";
import {
	addFolder,
	addFile,
	selectFile,
	deleteFile,
	renameFile,
	moveItem,
} from "@src/lib/store/slices/markdownSlice";

import { File, Folder } from "@src/features/markdown/type";

type NotificationType = "success" | "error" | "info";

type ShowNotificationFunc = (message: string, type: NotificationType) => void;

export const handleToggleFolder = (
	expandedFolders: Set<string>,
	setExpandedFolders: (newExpanded: Set<string>) => void,
	path: string,
): void => {
	const newExpanded = new Set(expandedFolders);
	if (newExpanded.has(path)) {
		newExpanded.delete(path);
	} else {
		newExpanded.add(path);
	}
	setExpandedFolders(newExpanded);
};

/**
 * Toggles file selection in the tree. Selecting the currently selected
 * file again deselects it - selectFile(null) resets selectedFile/content
 * back to null/"" inside the reducer (it does this unconditionally
 * before the typeof guard runs), so no separate "deselect" action or
 * reducer change is needed.
 */
export const handleFileToggleSelect = (
	dispatch: Dispatch<Action>,
	fullPath: string,
	currentSelectedFile: string | null,
): void => {
	dispatch(selectFile(currentSelectedFile === fullPath ? null : fullPath));
};

export const handleCreateFile = (
	dispatch: Dispatch<Action>,
	files: (File | Folder)[],
	showNotification: ShowNotificationFunc,
	newFilePath: string,
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
					item.type === "folder" && item.path === folderName,
			);

			if (!folder) {
				// Create missing folder structure
				const newFolder: Folder = {
					id: nanoid(),
					path: folderName,
					type: "folder",
					children: [],
				};

				dispatch(
					addFolder({
						parentPath: parentPath.join("/"),
						folder: newFolder,
					}),
				);

				currentLevel = newFolder.children;
			} else {
				currentLevel = folder.children;
			}

			parentPath.push(folderName);
		}

		const fileExists = currentLevel.some(
			(item) => item.type === "file" && item.path === fileName,
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
			}),
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
	showNotification: ShowNotificationFunc,
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
	showNotification: ShowNotificationFunc,
	type: "file" | "folder" = "file",
): void => {
	if (!newName.trim()) {
		showNotification("Please enter a valid name", "error");
		return;
	}

	if (newName.includes("/")) {
		showNotification("Name cannot contain slashes", "error");
		return;
	}

	// Only files carry the .md extension; folders keep the name as typed.
	const trimmed = newName.trim();
	const renamed =
		type === "folder" || trimmed.endsWith(".md") ? trimmed : `${trimmed}.md`;

	dispatch(renameFile({ oldPath: path, newName: renamed }));
	showNotification(
		type === "folder" ? "Folder renamed successfully" : "File renamed successfully",
		"success",
	);
};

/** Full paths of every folder in the tree, depth-first and sorted by name. */
export const listFolderPaths = (
	items: (File | Folder)[],
	parent = "",
): string[] =>
	sortFilesAlphabetically(items).flatMap((item) => {
		if (item.type !== "folder") return [];
		const fullPath = parent ? `${parent}/${item.path}` : item.path;
		return [fullPath, ...listFolderPaths(item.children, fullPath)];
	});

/**
 * Validates and dispatches a move of `sourcePath` into `destFolderPath`
 * ("" = root), showing a message instead of silently doing nothing.
 */
export const handleMoveItem = (
	dispatch: Dispatch<Action>,
	files: (File | Folder)[],
	sourcePath: string,
	destFolderPath: string,
	showNotification: ShowNotificationFunc,
): boolean => {
	const srcParts = sourcePath.split("/").filter(Boolean);
	const name = srcParts.pop();
	if (!name) return false;

	const parentPath = srcParts.join("/");
	if (destFolderPath === parentPath) {
		showNotification("Item is already in that folder", "info");
		return false;
	}
	if (
		destFolderPath === sourcePath ||
		destFolderPath.startsWith(`${sourcePath}/`)
	) {
		showNotification("Cannot move a folder into itself", "error");
		return false;
	}

	let level = files;
	for (const part of destFolderPath.split("/").filter(Boolean)) {
		const folder = level.find(
			(i): i is Folder => i.type === "folder" && i.path === part,
		);
		if (!folder) {
			showNotification("Destination folder not found", "error");
			return false;
		}
		level = folder.children;
	}
	if (level.some((i) => i.path === name)) {
		showNotification(`"${name}" already exists in that folder`, "error");
		return false;
	}

	dispatch(moveItem({ sourcePath, destFolderPath }));
	showNotification("Moved successfully", "success");
	return true;
};

export const findFileByPath = (
	files: (File | Folder)[],
	fullPath: string,
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
	items: (File | Folder)[],
): (File | Folder)[] => {
	return [...items].sort((a, b) => {
		// Folders first
		if (a.type === "folder" && b.type !== "folder") return -1;
		if (b.type === "folder" && a.type !== "folder") return 1;

		// Case-insensitive alphabetical sort
		return a.path.localeCompare(b.path, undefined, { sensitivity: "base" });
	});
};
