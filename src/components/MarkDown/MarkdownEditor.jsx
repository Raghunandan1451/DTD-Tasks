import HeaderWithButton from '@components/HeaderWithButton';
import FileTree from '@components/MarkDown/FileTree';
import Editor from '@components/MarkDown/Editor';

const MarkdownEditor = () => {
	return (
		<div className="h-screen bg-gray-900 text-white flex flex-col">
			<HeaderWithButton heading="Markdown Editor" />
			<div className="flex flex-1">
				<FileTree />
				<Editor />
			</div>
		</div>
	);
};

export default MarkdownEditor;
