import React from "react";
import Button from "@src/components/ui/button/Button";

interface TitleWithButtonProps {
	heading: string;
	onDownload: (heading: string) => void;
	buttonText: string;
	containerClass?: string;
}

const TitleWithButton: React.FC<TitleWithButtonProps> = (props) => {
	const { heading, onDownload, buttonText, containerClass } = props;
	return (
		<div className={`frosted-panel ${containerClass}`}>
			<h1 className="panel-title">{heading.toUpperCase()}</h1>
			<Button
				type="button"
				className="btn-primary"
				onClick={() => onDownload(heading)}
				text={buttonText}
			/>
		</div>
	);
};

export default TitleWithButton;
