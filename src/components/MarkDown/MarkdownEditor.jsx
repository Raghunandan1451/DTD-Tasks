import HeaderWithButton from '@components/HeaderWithButton';
import FileTree from '@components/MarkDown/FileTree';
import Editor from '@components/MarkDown/Editor';
import { handleZIPExport } from '@utils/downloadList';
import { useSelector } from 'react-redux';
import NotificationCenter from '@components/NotificationCeter';
import useNotifications from '@src/hooks/useNotifications';

const MarkdownEditor = () => {
	const { files } = useSelector((state) => state.fileManager);

	const { notifications, showNotification } = useNotifications();
	return (
		<div className="h-screen bg-gray-900 text-white flex flex-col">
			<HeaderWithButton
				heading="Markdown Editor"
				buttonText="Export as ZIP"
				onDownload={() => handleZIPExport(files, showNotification)}
			/>
			<div className="flex flex-1">
				<FileTree />
				<Editor />
			</div>

			<NotificationCenter notifications={notifications} />
		</div>
	);
};

export default MarkdownEditor;
