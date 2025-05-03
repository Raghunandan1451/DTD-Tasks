import React from 'react';

const Home: React.FC = () => {
	return (
		<div className="flex flex-col items-center justify-center h-full">
			<div className="text-center">
				<h1 className='text-3xl font-bold text-gray-800 dark:text-gray-200'>
					Welcome to Your List Manager!
				</h1>
				<p>
					Use the buttons on the left sidebar to navigate between
					different <strong>lists</strong>. Don't forget to <strong>download</strong> your lists within 24 hours of content creation, as the save feature is not yet available.
				</p>
			</div>
		</div>
	);
};

export default Home;
