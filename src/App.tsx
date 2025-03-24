import Home from '@src/pages/Home';
import ShoppingList from '@components/Shopping/ShoppingList';
import QRCodeGenerator from '@components/QRCode/QRCodeGenerator';
import MarkdownEditor from '@components/MarkDown/MarkdownEditor';

import Layout from '@layout/Layout';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { FC } from 'react';
import TodoPage from '@src/pages/TodoPage';

const router = createBrowserRouter([
	{
		path: '/',
		element: <Layout />, // Layout contains Navbar and Outlet
		children: [
			{ path: '/', element: <Home /> },
			{ path: '/todo', element: <TodoPage /> },
			{ path: '/shopping', element: <ShoppingList /> },
			{ path: '/qrgen', element: <QRCodeGenerator /> },
			{ path: '/markdown', element: <MarkdownEditor /> },
		],
	},
]);

const App: FC = () => {
	return <RouterProvider router={router} />;
};

export default App;
