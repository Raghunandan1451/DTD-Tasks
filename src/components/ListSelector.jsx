import { Link, useLocation } from 'react-router-dom';
const listNames = [
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
];

const ListSelector = () => {
	const location = useLocation();

	const isActive = (currentPath, targetPath) => {
		return currentPath.pathname === targetPath;
	};

	return (
		<nav className="flex flex-col gap-4 min-w-48 h-full px-1 py-2 overflow-y-auto scrollbar-hide">
			{listNames.map(({ id, name }, index) => (
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
