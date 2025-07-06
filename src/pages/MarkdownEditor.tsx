import React from "react";
import { handleZIPExport } from "@src/lib/utils/downloadHandler";
import { useSelector } from "react-redux";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import useNotifications from "@src/lib/hooks/useNotifications";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import FileTree from "@src/features/markdown/FileTree";
import Editor from "@src/features/markdown/Editor";
import { RootState } from "@src/lib/store/store";

const MarkdownEditor: React.FC = () => {
	const { files } = useSelector((state: RootState) => state.fileManager);

	const { notifications, showNotification } = useNotifications();
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
