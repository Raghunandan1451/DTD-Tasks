import React from 'react';
import Button from '@src/components/atoms/Button/Button';

interface TitleWithButtonProps {
	heading: string;
	onDownload: (heading: string) => void;
	buttonText: string;
	containerClass?: string;
}

const TitleWithButton: React.FC<TitleWithButtonProps> = (props) => {
	const { heading, onDownload, buttonText, containerClass } = props;
	return (
		<div className={`flex place-content-between place-items-center p-2 rounded-tl-xl bg-white/10 dark:bg-gray-900/20 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-lg text-black dark:text-white ${containerClass}`}>
			<h1 className="text-4xl font-bold">{heading.toUpperCase()}</h1>
			<Button
				type="button"
				className="bg-blue-500/75 hover:bg-blue-600/75 text-white p-2 rounded-lg shadow-md"
				onClick={() => onDownload(heading)}
				text={buttonText}
			/>
		</div>
	);
};

export default TitleWithButton;
