import React from 'react';

const Home: React.FC = () => {
	return (
		<div className="flex flex-col items-center justify-center h-full">
			<div className="text-center">
				<h1 className="text-2xl font-bold mb-4">
					Welcome to Your List Manager!
				</h1>
				<p className="text-lg">
					Use the buttons on the left sidebar to navigate between
					different <strong>lists</strong>. Don't forget to{' '}
					<strong>download</strong> your lists before leaving the
					page, as the save feature is not yet available.
				</p>
			</div>
		</div>
	);
};

export default Home;
