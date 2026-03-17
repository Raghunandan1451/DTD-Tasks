import React from "react";

interface ProgressBarProps {
	progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => (
	<div className="w-full max-w-md mb-8">
		<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
			<div
				className="bg-blue-600 h-2 rounded-full transition-all duration-300"
				style={{ width: `${progress}%` }}
			/>
		</div>
		<p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
			Preparing your data...
		</p>
	</div>
);

export default ProgressBar;
