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
import type { FileManagerData } from "@src/lib/types/downloadHandlerTypes";

const FileManager: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const { files, loaded, selectedFile } = useSelector(
		(state: RootState) => state.fileManager
	);
	const { notifications, showNotification } = useNotifications();

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
