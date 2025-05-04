import React from "react";

const Home: React.FC = () => {
	return (
		<div className="flex flex-col items-center justify-center h-full glassmorphic-bg">
			<div className="text-center">
				<h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
					Welcome to Your List Manager!
				</h1>
				<p>
					Make sure to download your lists within 24 hours, as the
					content will be automatically deleted after that. Use the
					buttons in the left sidebar to navigate between different{" "}
					<strong>lists</strong>.
				</p>
			</div>
		</div>
	);
};

export default Home;
