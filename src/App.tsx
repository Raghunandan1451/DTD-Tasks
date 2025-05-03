import Home from '@src/pages/Home';
import Todo from '@src/pages/Todo';
import Shopping from '@src/pages/Shopping';
import QRGenerator from '@src/pages/QRGenerator';
import MarkdownEditor from '@src/pages/MarkdownEditor';

import Layout from '@src/layout/Layout';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { FC } from 'react';
import { ThemeProvider } from '@src/context/ThemeContext';

const router = createBrowserRouter([
	{
		path: '/',
		element: <Layout />, // Layout contains Navbar and Outlet
		children: [
			{ path: '/', element: <Home /> },
			{ path: '/todo', element: <Todo /> },
			{ path: '/shopping', element: <Shopping /> },
			{ path: '/qrgen', element: <QRGenerator /> },
			{ path: '/markdown', element: <MarkdownEditor /> },
		],
	},
]);

const App: FC = () => {
	return (
		<ThemeProvider>
			<RouterProvider router={router} />;
		</ThemeProvider>
	)
};

export default App;
