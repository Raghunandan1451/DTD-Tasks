import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import useNotifications from "@src/lib/hooks/useNotifications";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import FileTree from "@src/features/markdown/FileTree";
import Editor from "@src/features/markdown/Editor";
import { AppDispatch, RootState } from "@src/lib/store/store";
import { hydrateMarkdown } from "@src/lib/store/thunks/markdownThunk";
import { setFileState } from "@src/lib/store/slices/markdownSlice";
import type { File, Folder } from "@src/features/markdown/type";
import { findFileByPath } from "@src/lib/utils/treeUtils";
import { generateIndividualFilePDF } from "@src/features/markdown/lib/enhancedPDFGenerator";
import {
	deleteOutputFile,
	queueOutputWrite,
	readMarkdownTree,
	writeOutputFile,
} from "@src/lib/utils/fileStorage/outputFiles";
import { hasOutputDirectory } from "@src/lib/utils/fileStorage/outputDirectory";

const getMarkdownPaths = (
	items: (File | Folder)[],
	parentPath = "",
): Array<{ path: string; file: File }> =>
	items.flatMap((item) => {
		const path = parentPath ? `${parentPath}/${item.path}` : item.path;
		if (item.type === "folder") return getMarkdownPaths(item.children, path);
		if (!item.path.toLowerCase().endsWith(".md")) return [];
		return [{ path, file: item }];
	});

const FileManager: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const { files, loaded, selectedFile } = useSelector(
		(state: RootState) => state.fileManager
	);
	const { notifications, showNotification } = useNotifications();
	const [outputLoaded, setOutputLoaded] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const previousOutputPaths = useRef<Set<string>>(new Set());

	useEffect(() => {
		if (!loaded) {
			dispatch(hydrateMarkdown());
		}
	}, [dispatch, loaded]);

	useEffect(() => {
		if (!loaded || outputLoaded) return;
		let cancelled = false;
		void (async () => {
			if (!(await hasOutputDirectory())) {
				setOutputLoaded(true);
				return;
			}
			const savedFiles = await readMarkdownTree();
			if (cancelled) return;

			const savedPaths = new Set<string>();
			for (const { path } of getMarkdownPaths(savedFiles)) {
				savedPaths.add(`Markdown/${path}`);
				savedPaths.add(
					`Markdown/${path.replace(/\.md$/i, ".pdf")}`,
				);
			}
			previousOutputPaths.current = savedPaths;

			if (getMarkdownPaths(savedFiles).length > 0) {
				dispatch(
					setFileState({
						files: savedFiles,
						selectedFile: null,
						content: "",
						loaded: true,
					}),
				);
			}
			setOutputLoaded(true);
		})().catch((error: unknown) => {
			if (!cancelled) {
				console.error("Failed to scan Markdown folder:", error);
				showNotification(
					error instanceof Error
						? error.message
						: "Unable to read Markdown files",
					"error",
				);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [dispatch, loaded, outputLoaded, showNotification]);

	const refreshMarkdownFiles = async () => {
		setIsRefreshing(true);
		try {
			if (!(await hasOutputDirectory())) {
				showNotification(
					"Select an output folder before refreshing Markdown files",
					"info",
				);
				return;
			}

			const savedFiles = await readMarkdownTree();
			const savedPaths = new Set<string>();
			for (const { path } of getMarkdownPaths(savedFiles)) {
				savedPaths.add(`Markdown/${path}`);
				savedPaths.add(`Markdown/${path.replace(/\.md$/i, ".pdf")}`);
			}
			previousOutputPaths.current = savedPaths;

			const selected = selectedFile
				? findFileByPath(savedFiles, selectedFile)
				: null;
			dispatch(
				setFileState({
					files: savedFiles,
					selectedFile: selected ? selectedFile : null,
					content: selected?.content ?? "",
					loaded: true,
				}),
			);
			showNotification("Markdown files refreshed", "success");
		} catch (error) {
			console.error("Failed to refresh Markdown folder:", error);
			showNotification(
				error instanceof Error
					? error.message
					: "Unable to refresh Markdown files",
				"error",
			);
		} finally {
			setIsRefreshing(false);
		}
	};

	useEffect(() => {
		if (!loaded || !outputLoaded) return;
		const timeout = window.setTimeout(() => {
			void queueOutputWrite(async () => {
				if (!(await hasOutputDirectory())) return;
				const markdownFiles = getMarkdownPaths(files);
				const currentPaths = new Set<string>();
				markdownFiles.forEach(({ path }) => {
					currentPaths.add(`Markdown/${path}`);
					currentPaths.add(
						`Markdown/${path.replace(/\.md$/i, ".pdf")}`,
					);
				});

				await Promise.all(
					Array.from(previousOutputPaths.current)
						.filter((path) => !currentPaths.has(path))
						.map((path) => deleteOutputFile(path)),
				);
				for (const { path, file } of markdownFiles) {
					await Promise.all([
						writeOutputFile(`Markdown/${path}`, file.content),
						writeOutputFile(
							`Markdown/${path.replace(/\.md$/i, ".pdf")}`,
							generateIndividualFilePDF(file).output("blob"),
						),
					]);
				}
				previousOutputPaths.current = currentPaths;
			}).catch((error: unknown) => {
				console.error("Failed to save Markdown files:", error);
				showNotification(
					error instanceof Error
						? error.message
						: "Unable to save Markdown files",
					"error",
				);
			});
		}, 700);
		return () => window.clearTimeout(timeout);
	}, [files, loaded, outputLoaded, showNotification]);

	return (
		<>
			<div className="h-full text-white flex flex-col">
				<TitleWithButton
					heading="Markdown Editor"
					onRefresh={refreshMarkdownFiles}
					isRefreshing={isRefreshing}
				/>
				<div className="flex flex-1 min-h-0 border border-white/20 dark:border-white/10">
					<FileTree />
					<Editor />
				</div>
			</div>
			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default FileManager;
