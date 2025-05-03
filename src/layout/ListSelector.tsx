import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from '@src/components/molecules/ThemeToggle/ThemeToggle';

// Define the proper types for our navigation structure
interface ListItem {
	id: string;
	name: string;
  }
  
  interface NavigationGroup {
	title?: string; // Optional group title
	items: ListItem[];
  }
  
  // Create the updated navigation structure
  const navigationData: NavigationGroup[] = [
	{
	  // Home doesn't need a group title
	  items: [
		{
		  id: '',
		  name: 'Home',
		}
	  ]
	},
	{
	  title: 'Lists',
	  items: [
		{
		  id: 'todo',
		  name: 'To-Do',
		},
		{
		  id: 'shopping',
		  name: 'Shopping',
		}
	  ]
	},
	{
	  title: 'Generators',
	  items: [
		{
		  id: 'qrgen',
		  name: 'QR Code',
		}
	  ]
	},
	{
	  title: 'Editors',
	  items: [
		{
		  id: 'markdown',
		  name: 'Markdown',
		}
	  ]
	}
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
		<nav className="glass-nav scrollbar-hide">
			<div className="flex justify-between items-center px-2 mb-4">
				<h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
					AIOLists
				</h2>
				<ThemeToggle />
    		</div>
			{navigationData.map((group, groupIndex) => (
				<div key={groupIndex} className="flex flex-col gap-1">
					{group.title && (
						<div className="glass-nav-section-title">{group.title}</div>
					)}
					{group.items.map(({ id, name }) => (
						<Link
							key={id}
							to={`/${id}`}
							className={`${
								isActive(location, `/${id}`) ? 'active' : ''
							} glass-link`}>
							{name}
						</Link>
  					))}
				</div>
			))}
		</nav>
	);
};

export default ListSelector;
