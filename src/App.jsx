import ShoppingList from '@components/ShoppingList';
import TodoList from '@components/ToDoList';
import Home from '@src/pages/Home';
import QRCodeGenerator from '@components/QRCode/QRCodeGenerator';

import Layout from '@layout/Layout';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
	{
		path: '/',
		element: <Layout />, // Layout contains Navbar and Outlet
		children: [
			{ path: '/', element: <Home /> },
			{ path: '/todo', element: <TodoList /> },
			{ path: '/shopping', element: <ShoppingList /> },
			{ path: '/qrgen', element: <QRCodeGenerator /> },
		],
	},
]);

function App() {
	return <RouterProvider router={router} />;
}

export default App;
