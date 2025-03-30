import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface ListItem {
	id: string;
	name: string;
}

const listNames: ListItem[] = [
	{
		id: '',
		name: 'Home',
	},
	{
		id: 'todo',
		name: 'ToDo List',
	},
	{
		id: 'shopping',
		name: 'Shopping List',
	},
	{
		id: 'qrgen',
		name: 'QR Code Generator',
	},
	{
		id: 'markdown',
		name: 'Markdown Editor',
	},
];

const ListSelector: React.FC = () => {
	const location = useLocation();

	const isActive = (
		currentPath: { pathname: string },
		targetPath: string
	): boolean => {
		return currentPath.pathname === targetPath;
	};

	return (
		<nav className="flex flex-col gap-4 min-w-48 h-full px-1 py-2 overflow-y-auto scrollbar-hide">
			{listNames.map(({ id, name }) => (
				<Link
					key={id}
					to={`/${id}`}
					className={`${
						isActive(location, `/${id}`)
							? 'bg-teal-400 text-white hover:text-white'
							: ''
					} px-2 py-1 rounded-md text-white hover:text-white hover:bg-teal-500`}>
					{name}
				</Link>
			))}
		</nav>
	);
};

export default ListSelector;
