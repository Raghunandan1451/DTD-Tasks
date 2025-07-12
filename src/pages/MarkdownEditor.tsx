import React, { useEffect } from "react";
import { handleZIPExport } from "@src/lib/utils/downloadHandler";
import { useDispatch, useSelector } from "react-redux";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import useNotifications from "@src/lib/hooks/useNotifications";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import FileTree from "@src/features/markdown/FileTree";
import Editor from "@src/features/markdown/Editor";
import { AppDispatch, RootState } from "@src/lib/store/store";
import { hydrateMarkdown } from "@src/lib/store/thunks/markdownThunks";

const MarkdownEditor: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const { files, loaded } = useSelector(
		(state: RootState) => state.fileManager
	);

	const { notifications, showNotification } = useNotifications();

	useEffect(() => {
		if (!loaded) {
			dispatch(hydrateMarkdown());
		}
	}, [dispatch, loaded]);
	return (
		<div className="h-full text-white flex flex-col">
			<TitleWithButton
				heading="Markdown Editor"
				buttonText="Export as ZIP"
				onDownload={() => handleZIPExport(files, showNotification)}
			/>
			<div className="flex flex-1 min-h-0">
				<FileTree />
				<Editor />
			</div>

			<NotificationCenter notifications={notifications} />
		</div>
	);
};

export default MarkdownEditor;
