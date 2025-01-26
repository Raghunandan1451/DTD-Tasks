import React, { useState } from 'react';
import HeaderWithButton from '@components/HeaderWithButton';
import FileTree from '@components/MarkDown/FileTree';
import Editor from '@components/MarkDown/Editor';

const MarkdownEditor = () => {
	return (
		<div className="h-screen bg-gray-900 text-white">
			<HeaderWithButton heading="Markdown Editor" />

			<div className="flex">
				<FileTree />
				<Editor />
			</div>
		</div>
	);
};

export default MarkdownEditor;
