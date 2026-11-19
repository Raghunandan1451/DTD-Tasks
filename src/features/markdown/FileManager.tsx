import React, { useEffect } from "react";
import {
	handleMarkdownExport,
	handleJSONUpload,
} from "@src/lib/utils/downloadHandler";
import { useDispatch, useSelector } from "react-redux";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import useNotifications from "@src/lib/hooks/useNotifications";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import FileTree from "@src/features/markdown/FileTree";
import DiaryEditor from "@src/features/markdown/DiaryEditor";
import { AppDispatch, RootState } from "@src/lib/store/store";
import { hydrateMarkdown } from "@src/lib/store/thunks/markdownThunk";
import { setFileState, deselectFile } from "@src/lib/store/slices/markdownSlice";
import Button from "@src/components/ui/button/Button";
import { findFileByPath } from "@src/lib/utils/treeUtils";
import { pdfExists, saveNotePdf } from "@src/features/markdown/lib/saveNotePdf";
import { NOTES_ROOT } from "@src/lib/storage/folder/fileNames";
import type { FileManagerData } from "@src/lib/types/downloadHandlerTypes";

const FileManager: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const { files, loaded, selectedFile } = useSelector(
		(state: RootState) => state.fileManager
	);
	const { notifications, showNotification } = useNotifications();
	// Only the desktop build has this; there the notes are files in the data folder.
	const desktop = window.desktop;

	const handleSavePdf = async () => {
		if (!desktop || !selectedFile) return;
		const note = findFileByPath(files, selectedFile);
		if (note?.type !== "file") return;
		try {
			const existed = await pdfExists(desktop, selectedFile);
			if (existed && !window.confirm("This note already has a PDF. Replace it with the current text?")) {
				return;
			}
			const saved = await saveNotePdf(desktop, note, selectedFile);
			showNotification(`${existed ? "Updated" : "Saved"} ${saved}`, "success");
		} catch {
			showNotification("Could not save the PDF", "error");
		}
	};

	const handleOpenFolder = async () => {
		try {
			await desktop?.shell.openFolder(NOTES_ROOT);
		} catch {
			showNotification("Could not open the folder", "error");
		}
	};

	useEffect(() => {
		if (!loaded) {
			dispatch(hydrateMarkdown());
		}
	}, [dispatch, loaded]);

	const handleDownload = () => {
		return handleMarkdownExport(files, showNotification);
	};

	const handleUpload = (file: File) => {
		return handleJSONUpload<FileManagerData>(
			file,
			(data) => {
				dispatch(setFileState(data));
				showNotification(
					"Notes restored successfully",
					"success"
				);
			},
			(error) => showNotification(error, "error"),
			showNotification
		);
	};

	return (
		<>
			<div className="h-full text-white flex flex-col">
				<TitleWithButton
					heading="Notes"
					buttonText="Download"
					onDownload={handleDownload}
					onUpload={handleUpload}
					showUpload={true}
					hideTransfer={Boolean(desktop)}
					actions={
						desktop && (
							<>
								<Button
									type="button"
									className="btn-primary text-xs md:text-base py-1.5 md:py-2 px-2.5 md:px-4"
									onClick={handleSavePdf}
									disabled={!selectedFile}
									text="Save as PDF"
								/>
								<Button
									type="button"
									className="btn-secondary text-xs md:text-base py-1.5 md:py-2 px-2.5 md:px-4"
									onClick={handleOpenFolder}
									text="Open folder"
								/>
							</>
						)
					}
					showNotification={showNotification}
				/>
				<div className="flex flex-1 min-h-0 border border-white/20 dark:border-white/10">
					{/* On phones show one pane at a time: file list, or editor once a file is open */}
					<FileTree className={selectedFile ? "hidden md:flex" : "flex"} />
					<DiaryEditor
						key={selectedFile ?? "none"}
						className={selectedFile ? "flex" : "hidden md:flex"}
						onBack={() => dispatch(deselectFile())}
					/>
				</div>
			</div>
			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default FileManager;
