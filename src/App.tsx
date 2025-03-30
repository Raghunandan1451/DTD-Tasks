import Home from '@src/pages/Home';
import TodoPage from '@src/pages/Todo';
import ShoppingPage from '@src/pages/Shopping';
import QRGenerator from '@src/pages/QRGenerator';
import MarkdownEditor from '@src/pages/MarkdownEditor';

import Layout from '@src/layout/Layout';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { FC } from 'react';

const router = createBrowserRouter([
	{
		path: '/',
		element: <Layout />, // Layout contains Navbar and Outlet
		children: [
			{ path: '/', element: <Home /> },
			{ path: '/todo', element: <TodoPage /> },
			{ path: '/shopping', element: <ShoppingPage /> },
			{ path: '/qrgen', element: <QRGenerator /> },
			{ path: '/markdown', element: <MarkdownEditor /> },
		],
	},
]);

const App: FC = () => {
	return <RouterProvider router={router} />;
};

export default App;
