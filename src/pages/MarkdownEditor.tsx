import React from 'react';
import { handleZIPExport } from '@src/utils/downloadHandler';
import { useSelector } from 'react-redux';
import NotificationCenter from '@src/components/organisms/Notifications/NotificationCeter';
import useNotifications from '@src/hooks/useNotifications';
import TitleWithButton from '@src/components/molecules/Header/TitleWithButton';
import FileTree from '@src/components/organisms/Markdown/FileTree';
import Editor from '@src/components/organisms/Markdown/Editor';
import { RootState } from '@src/store/store';

const MarkdownEditor: React.FC = () => {
	const { files } = useSelector((state: RootState) => state.fileManager);

	const { notifications, showNotification } = useNotifications();
	return (
		<div className="h-full bg-gray-900 text-white flex flex-col">
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
